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
const publicHtmlFiles = [
  "index.html",
  "home/index.html",
  "team/index.html",
  "publication/index.html",
  "presentation/index.html",
  "activity/index.html",
  "daily/index.html",
  "upload-seminar/index.html",
  "edit-seminar/index.html"
];

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
if (!presentation.includes("/static/js/seminar-manage-links.js")) {
  fail("presentation/index.html must load /static/js/seminar-manage-links.js.");
}
if (!presentation.includes('id="content-seminar-rows"')) {
  fail("presentation/index.html must include #content-seminar-rows.");
}
if ((presentation.match(/<tr\b/gi) || []).length > 0) {
  fail("presentation/index.html must not contain static seminar rows.");
}

const presentationScript = await readText("static/js/presentation-content.js");
if (!presentationScript.includes("hasManageFlag()")) {
  fail("presentation-content.js must gate row edit links behind the manage flag.");
}
if (!presentationScript.includes('link.href = "/edit-seminar/?" + params.toString();')) {
  fail("presentation-content.js must link seminar rows to /edit-seminar/ with query parameters.");
}

const manageScript = await readText("static/js/seminar-manage-links.js");
if (!manageScript.includes('var manageParam = "manage";')) {
  fail("seminar-manage-links.js must use the manage query flag.");
}
if (!manageScript.includes("seminar-manage-enabled")) {
  fail("seminar-manage-links.js must enable hidden seminar management links.");
}

for (const file of publicHtmlFiles) {
  const html = await readText(file);
  if (html.includes('href="/upload-seminar"')) {
    if (!html.includes("/static/js/seminar-manage-links.js")) {
      fail(`${file} must load /static/js/seminar-manage-links.js when it links to upload-seminar.`);
    }
    if (!html.includes("data-seminar-manage")) {
      fail(`${file} must hide upload-seminar links behind data-seminar-manage.`);
    }
  }
}

const uploadScript = await readText("static/js/upload-seminar.js");
if (!uploadScript.includes('var repoName = "vie-group-content";')) {
  fail("upload-seminar.js must open issues in vie-group-content.");
}

const editPage = await readText("edit-seminar/index.html");
if (!editPage.includes("/static/js/edit-seminar.js")) {
  fail("edit-seminar/index.html must load /static/js/edit-seminar.js.");
}

const editScript = await readText("static/js/edit-seminar.js");
if (!editScript.includes('var repoName = "vie-group-content";')) {
  fail("edit-seminar.js must open issues in vie-group-content.");
}
if (!editScript.includes('var issueLabel = "seminar-edit";')) {
  fail("edit-seminar.js must use the seminar-edit issue label.");
}

for (const file of ["site.json", "news.json", "team.json", "publications.json", "seminars.json", "activities.json"]) {
  await checkUrl(`${source.dataBaseUrl}${file}`);
}
await checkUrl(source.rssUrl);

console.log("Site shell and content source configuration are valid.");
