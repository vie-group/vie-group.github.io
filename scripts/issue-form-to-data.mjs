import { readFile, writeFile, appendFile } from "node:fs/promises";

const command = process.argv[2];

function slugify(value) {
  const slug = String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || `item-${Date.now()}`;
}

function splitTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function cleanValue(value) {
  const cleaned = String(value || "")
    .replace(/<!--.*?-->/gs, "")
    .replace(/^_No response_$/gm, "")
    .trim();
  return cleaned === "_No response_" ? "" : cleaned;
}

function parseIssueForm(body) {
  const fields = {};
  let current = null;
  for (const line of String(body || "").split(/\r?\n/)) {
    const header = line.match(/^###\s+(.+?)\s*$/);
    if (header) {
      current = normalizeLabel(header[1]);
      fields[current] = [];
      continue;
    }
    if (current) fields[current].push(line);
  }
  return Object.fromEntries(Object.entries(fields).map(([key, lines]) => [key, cleanValue(lines.join("\n"))]));
}

function field(fields, label, required = false) {
  const value = fields[normalizeLabel(label)] || "";
  if (required && !value) throw new Error(`${label} is required in the issue form.`);
  return value;
}

async function writeOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const safeValue = String(value || "");
  if (safeValue.includes("\n")) {
    const marker = `EOF_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    await appendFile(process.env.GITHUB_OUTPUT, `${name}<<${marker}\n${safeValue}\n${marker}\n`);
  } else {
    await appendFile(process.env.GITHUB_OUTPUT, `${name}=${safeValue}\n`);
  }
}

async function addSeminarFromIssue() {
  const bodyPath = process.env.ISSUE_BODY_PATH;
  if (!bodyPath) throw new Error("ISSUE_BODY_PATH is required.");
  const fields = parseIssueForm(await readFile(bodyPath, "utf8"));
  const date = field(fields, "Date", true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date must use YYYY-MM-DD.");

  const title = field(fields, "Title", true);
  const speaker = field(fields, "Speaker", true);
  const links = {};
  for (const [key, label] of [
    ["paper", "Paper URL"],
    ["slides", "Slides URL"],
    ["code", "Code URL"],
    ["video", "Video URL"]
  ]) {
    const value = field(fields, label);
    if (value) links[key] = value;
  }

  const record = {
    id: `${date}-${slugify(title)}`,
    date,
    speaker,
    title,
    abstract: field(fields, "Abstract"),
    links,
    tags: splitTags(field(fields, "Tags"))
  };

  const path = "data/seminars.json";
  const items = JSON.parse(await readFile(path, "utf8"));
  const next = [record, ...items.filter((item) => item.id !== record.id)].sort((a, b) =>
    String(b.date).localeCompare(String(a.date))
  );
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await writeOutput("id", record.id);
  await writeOutput("title", record.title);
  await writeOutput("speaker", record.speaker);
  console.log(`Prepared seminar PR data for ${record.id}`);
}

if (command === "seminar") {
  await addSeminarFromIssue();
} else {
  throw new Error("Usage: node scripts/issue-form-to-data.mjs seminar");
}
