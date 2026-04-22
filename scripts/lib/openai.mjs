import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.mjs";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MIN_WORDS = 70;
const MAX_WORDS = 170;
const MAX_RETRIES = 2;
/** Per-completion ceiling so a hung request cannot burn the whole CI budget (ms). */
const OPENAI_REQUEST_MS = Number(process.env.OPENAI_TIMEOUT_MS) || 50_000;

function countWords(text) {
  return (text.trim().match(/\S+/g) || []).length;
}

export function sanitizePost(raw) {
  if (!raw) return "";
  let text = String(raw);

  text = text.replace(/\p{Extended_Pictographic}/gu, "");
  text = text.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "");

  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/`([^`]+)`/g, "$1");

  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  text = text.replace(/^\s{0,3}>\s?/gm, "");
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");

  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(?=\S)([^*_\n]+?)\1/g, "$2");

  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]{2,}/g, " ");

  return text.trim();
}

function validate(post) {
  const words = countWords(post);
  if (words < MIN_WORDS) return `too short (${words} words)`;
  if (words > MAX_WORDS) return `too long (${words} words)`;
  if (/\p{Extended_Pictographic}/u.test(post)) return "contains emoji";
  if (/[#*_`>]/.test(post)) return "contains markdown markers";
  const longPara = post
    .split(/\n{2,}/)
    .some((p) => p.split("\n").length > 5);
  if (longPara) return "paragraph longer than 5 lines";
  return null;
}

function postsFromParsed(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return { ai_post: "", web3_post: "" };
  }
  const aiRaw =
    parsed.ai_post ??
    parsed.aiPost ??
    (parsed.posts && typeof parsed.posts === "object" ? parsed.posts.ai : undefined);
  const web3Raw =
    parsed.web3_post ??
    parsed.web3Post ??
    (parsed.posts && typeof parsed.posts === "object" ? parsed.posts.web3 : undefined);
  return {
    ai_post: sanitizePost(aiRaw ?? ""),
    web3_post: sanitizePost(web3Raw ?? "")
  };
}

async function callOnce(client, userPrompt) {
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.8,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ]
  });
  const content = completion.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);
  return postsFromParsed(parsed);
}

export async function generatePosts({ aiArticles, web3Articles }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const client = new OpenAI({ apiKey, timeout: OPENAI_REQUEST_MS });

  let retryNote = "";
  let lastResult = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const userPrompt = buildUserPrompt({ aiArticles, web3Articles, retryNote });
    const result = await callOnce(client, userPrompt);
    lastResult = result;

    const aiIssue = validate(result.ai_post);
    const web3Issue = validate(result.web3_post);
    if (!aiIssue && !web3Issue) {
      return result;
    }

    const issues = [];
    if (aiIssue) issues.push(`ai_post ${aiIssue}`);
    if (web3Issue) issues.push(`web3_post ${web3Issue}`);
    console.warn(`[openai] attempt ${attempt + 1} failed validation: ${issues.join("; ")}`);
    retryNote = `Previous attempt had issues: ${issues.join("; ")}. Regenerate both posts. Each post must be 80-150 words, plain text, no emojis, no markdown, paragraphs of at most 5 lines.`;
  }

  console.warn("[openai] returning best-effort result after retries exhausted");
  return lastResult;
}
