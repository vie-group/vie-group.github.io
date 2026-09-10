import { readFile } from "node:fs/promises";

function fail(message) {
  throw new Error(message);
}

async function readText(path) {
  return readFile(path, "utf8");
}

async function readJson(path) {
  return JSON.parse(await readText(path));
}

async function checkUrl(url) {
  const response = await fetch(url, { method: "HEAD", redirect: "follow" });
  if (!response.ok) fail(`${url} returned ${response.status}.`);
}

const source = await readJson("content-source.json");

if (source.schemaVersion !== 1) fail("content-source.json schemaVersion must be 1.");
if (source.repository !== "vie-group/vie-group-content") {
  fail("content-source.json repository must be vie-group/vie-group-content.");
}
for (const key of ["rawBaseUrl", "dataBaseUrl", "assetBaseUrl", "rssUrl"]) {
  if (!String(source[key] || "").startsWith("https://vie-group.github.io/vie-group-content/")) {
    fail(`content-source.json ${key} must use https://vie-group.github.io/vie-group-content/.`);
  }
}

const presentation = await readText("presentation/index.html");
if (!presentation.includes("/static/js/presentation-content.js")) {
  fail("presentation/index.html must load /static/js/presentation-content.js.");
}
if (!presentation.includes('id="content-seminar-rows"')) {
  fail("presentation/index.html must include #content-seminar-rows.");
}

const uploadScript = await readText("static/js/upload-seminar.js");
if (!uploadScript.includes('var repoName = "vie-group-content";')) {
  fail("upload-seminar.js must open issues in vie-group-content.");
}

for (const file of ["site.json", "news.json", "team.json", "publications.json", "seminars.json", "activities.json"]) {
  await checkUrl(`${source.dataBaseUrl}${file}`);
}
await checkUrl(source.rssUrl);

console.log("Site shell and content source configuration are valid.");
