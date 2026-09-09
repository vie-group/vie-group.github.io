import { readFile, writeFile } from "node:fs/promises";

const seminarsPath = "data/seminars.json";
const presentationPath = "presentation/index.html";
const contentSourcePath = "content-source.json";

async function readContentSource() {
  try {
    return JSON.parse(await readFile(contentSourcePath, "utf8"));
  } catch {
    return {};
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeHref(value) {
  const href = String(value || "").trim();
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  if (/^\/?assets\//i.test(href)) return contentAssetUrl(href.replace(/^\/+/, ""));
  return `/${href.replace(/^\/+/, "")}`;
}

const contentSource = await readContentSource();
const contentAssetBaseUrl = (
  process.env.CONTENT_ASSET_BASE_URL ||
  contentSource.assetBaseUrl ||
  contentSource.rawBaseUrl ||
  ""
).replace(/\/+$/, "");

function contentAssetUrl(path) {
  if (!contentAssetBaseUrl) return `/${path}`;
  return `${contentAssetBaseUrl}/${path}`;
}

function displayDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function materialLink(label, href) {
  const normalized = normalizeHref(href);
  return normalized ? `<a href="${escapeHtml(normalized)}">${label}</a>&nbsp;&nbsp;` : "";
}

function imageCell(record) {
  const image = normalizeHref(record.links?.image);
  if (!image) {
    return '<span class="archive-missing-image" style="width:160px;min-height:100px">archived image unavailable</span>';
  }
  return `<img onerror="archiveMissingImage(this)" src="${escapeHtml(image)}" width="160"/>`;
}

function seminarRow(record) {
  const links = record.links || {};
  return `
                    <tr data-seminar-id="${escapeHtml(record.id)}">
                        <td style="width:20%">${imageCell(record)}</td>
                        <td style="width:80%"><p><font size="3"><b>${escapeHtml(record.title)}</b></font><br/>
                            <font size="2">${escapeHtml(record.speaker)}<br/>
                            </font><i>${escapeHtml(displayDate(record.date))}</i></p>
                            <p>
                                ${materialLink("PDF", links.paper)}
                                ${materialLink("PPT", links.slides)}
                                ${materialLink("CODE", links.code)}
                                ${materialLink("VIDEO", links.video)}
                            </p>
                        </td>
                    </tr>
                    <tr data-seminar-separator="${escapeHtml(record.id)}">
                        <td colspan="2">
                            <div class="archive-separator"></div>
                        </td>
                    </tr>
`;
}

function selectedId() {
  const idArg = process.argv.find((arg) => arg.startsWith("--id="));
  return process.env.SEMINAR_ID || (idArg ? idArg.slice("--id=".length) : "");
}

function isManagedRecord(record) {
  return record.source?.type === "github-issue";
}

function removeManagedRows(html) {
  return html.replace(
    /\n?\s*<tr data-seminar-id="[^"]+">[\s\S]*?<tr data-seminar-separator="[^"]+">[\s\S]*?<\/tr>/gm,
    ""
  );
}

async function syncManagedRows(seminars) {
  const marker = '<table class="proj_content">';
  let html = await readFile(presentationPath, "utf8");
  html = removeManagedRows(html);
  const index = html.indexOf(marker);
  if (index === -1) throw new Error(`Could not find ${marker} in ${presentationPath}.`);

  const rows = seminars
    .filter(isManagedRecord)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map(seminarRow)
    .join("");

  const insertAt = index + marker.length;
  html = `${html.slice(0, insertAt)}\n${rows}${html.slice(insertAt)}`;
  await writeFile(presentationPath, html, "utf8");
  console.log(`Synced ${seminars.filter(isManagedRecord).length} managed legacy seminar rows.`);
}

const seminars = JSON.parse(await readFile(seminarsPath, "utf8"));
if (process.argv.includes("--sync-managed")) {
  await syncManagedRows(seminars);
  process.exit(0);
}

const id = selectedId();
const record = id ? seminars.find((item) => item.id === id) : seminars[0];
if (!record) throw new Error(id ? `Seminar not found: ${id}` : "No seminar records found.");

let html = await readFile(presentationPath, "utf8");
if (html.includes(`data-seminar-id="${record.id}"`)) {
  const escapedId = record.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existingRow = new RegExp(
    `\\n?\\s*<tr data-seminar-id="${escapedId}">[\\s\\S]*?<tr data-seminar-separator="${escapedId}">[\\s\\S]*?</tr>`,
    "m"
  );
  if (!existingRow.test(html)) throw new Error(`Could not replace legacy seminar row: ${record.id}`);
  html = html.replace(existingRow, `\n${seminarRow(record).trimEnd()}`);
  await writeFile(presentationPath, html, "utf8");
  console.log(`Updated legacy seminar row: ${record.id}`);
  process.exit(0);
}

const marker = '<table class="proj_content">';
const index = html.indexOf(marker);
if (index === -1) throw new Error(`Could not find ${marker} in ${presentationPath}.`);

const insertAt = index + marker.length;
html = `${html.slice(0, insertAt)}\n${seminarRow(record)}${html.slice(insertAt)}`;
await writeFile(presentationPath, html, "utf8");
console.log(`Inserted legacy seminar row: ${record.id}`);
