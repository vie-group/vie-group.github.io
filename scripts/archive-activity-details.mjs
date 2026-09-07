import { execFile } from "node:child_process";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const activityPath = "activity/index.html";
const detailsPath = "data/activity-details.json";
const manifestPath = "data/activity-asset-manifest.json";
const snapshotTimestamp = "20240414160055";
const maxBytes = 95 * 1024 * 1024;
const shouldDownload = process.argv.includes("--download");
const useCdx = process.argv.includes("--cdx");
const concurrency = 4;

function decodeHtml(value) {
  return String(value || "")
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|ensp);/gi, (match, entity) => {
      const lower = entity.toLowerCase();
      if (lower === "amp") return "&";
      if (lower === "lt") return "<";
      if (lower === "gt") return ">";
      if (lower === "quot") return "\"";
      if (lower === "apos") return "'";
      if (lower === "nbsp" || lower === "ensp") return " ";
      if (lower.startsWith("#x")) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
      if (lower.startsWith("#")) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
      return match;
    });
}

function stripTags(value) {
  return decodeHtml(
    String(value || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[\u00a0\u2002]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function slugify(value) {
  const slug = String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "activity";
}

function isoDate(value) {
  const match = stripTags(value).match(/^([A-Za-z.]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match) return "";
  const month = match[1].replace(/\.$/, "").toLowerCase();
  const months = {
    jan: "01",
    january: "01",
    feb: "02",
    february: "02",
    mar: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    aug: "08",
    august: "08",
    sep: "09",
    sept: "09",
    september: "09",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12"
  };
  const mm = months[month];
  if (!mm) return "";
  return `${match[3]}-${mm}-${match[2].padStart(2, "0")}`;
}

function normalizeRef(src) {
  let ref = String(src || "").trim().replace(/^https?:\/\/(?:www\.)?vie\.group\//i, "");
  ref = ref.replace(/^\/+/, "");
  try {
    ref = decodeURI(ref);
  } catch (_) {
    // Keep the original string if it is not valid URI-encoded text.
  }
  return ref;
}

function imageRefs(value) {
  const refs = [];
  const imagePattern = /<img\b[^>]*\bsrc="([^"]+)"/gi;
  let match;
  while ((match = imagePattern.exec(value))) {
    refs.push(normalizeRef(match[1]));
  }
  return refs.filter(Boolean);
}

function extractActivities(html) {
  const itemPattern =
    /<li>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<font\s+size="3">([\s\S]*?)<\/font>[\s\S]*?<a\s+onclick="detail\((\d+)\)"[\s\S]*?<\/li>\s*<div\s+id="img_(\d+)"[\s\S]*?>([\s\S]*?)<\/div>\s*<div\s+id="p_(\d+)"[\s\S]*?>([\s\S]*?)<\/div>/gi;
  const activities = [];
  let match;

  while ((match = itemPattern.exec(html))) {
    const [, dateHtml, titleHtml, legacyId, imageId, imageHtml, detailId, detailHtml] = match;
    if (legacyId !== imageId || legacyId !== detailId) {
      throw new Error(`Mismatched activity detail IDs around legacy id ${legacyId}.`);
    }

    const date = isoDate(dateHtml);
    const title = stripTags(titleHtml);
    const images = imageRefs(imageHtml);
    const detailText = stripTags(detailHtml);

    activities.push({
      id: `${date || "unknown-date"}-${slugify(title)}`,
      legacyId,
      date,
      title,
      detailText,
      detailHtml: detailHtml.trim(),
      images,
      source: {
        page: activityPath,
        waybackSnapshot: `https://web.archive.org/web/${snapshotTimestamp}/http://www.vie.group/activity/`
      }
    });
  }

  return activities;
}

async function fileStatus(ref) {
  try {
    const info = await stat(ref);
    return info.size > 0 ? { status: "existing", bytes: info.size } : { status: "empty" };
  } catch (_) {
    return { status: "missing" };
  }
}

function waybackDirectUrl(ref, host = "www.vie.group", timestamp = "0") {
  return `https://web.archive.org/web/${timestamp}id_/http://${host}/${encodeURI(ref)}`;
}

async function curlText(url) {
  const { stdout } = await execFileAsync(
    "curl",
    ["-L", "--fail", "--silent", "--show-error", "--max-time", "15", "--user-agent", "vie-group activity archive", url],
    { maxBuffer: 12 * 1024 * 1024 }
  );
  return stdout;
}

async function cdxCandidates(ref) {
  const rows = [];
  for (const host of ["www.vie.group", "vie.group"]) {
    const query = new URL("https://web.archive.org/cdx");
    query.searchParams.set("url", `${host}/${ref}`);
    query.searchParams.set("from", "20180101");
    query.searchParams.set("to", snapshotTimestamp);
    query.searchParams.set("output", "json");
    query.searchParams.set("fl", "timestamp,original,statuscode,mimetype,digest");
    query.searchParams.append("filter", "statuscode:200");
    query.searchParams.set("collapse", "digest");

    try {
      const body = await curlText(query.toString());
      const parsed = JSON.parse(body);
      for (const row of parsed.slice(1)) {
        rows.push({
          timestamp: row[0],
          original: row[1],
          statusCode: row[2],
          mimetype: row[3],
          digest: row[4]
        });
      }
    } catch (error) {
      rows.push({ query: query.toString(), error: error.message });
    }
  }
  return rows
    .filter((row) => row.timestamp && row.original)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

async function downloadCandidate(ref, url) {
  const destination = path.resolve(ref);
  const tmp = `${destination}.download`;
  await mkdir(path.dirname(destination), { recursive: true });
  await rm(tmp, { force: true });

  const { stdout } = await execFileAsync(
    "curl",
    [
      "-L",
      "--fail",
      "--silent",
      "--show-error",
      "--retry",
      "1",
      "--max-time",
      "25",
      "--user-agent",
      "vie-group activity archive",
      "--output",
      tmp,
      "--write-out",
      "\n%{http_code}\t%{content_type}\t%{size_download}\t%{url_effective}",
      url
    ],
    { maxBuffer: 1024 * 1024 }
  );

  const meta = stdout.trim().split(/\r?\n/).pop() || "";
  const [, contentType = "", sizeText = "", effectiveUrl = url] = meta.split("\t");
  const bytes = Number(sizeText);
  if (/^text\/html\b/i.test(contentType)) {
    await rm(tmp, { force: true });
    throw new Error(`Wayback returned HTML for ${ref}`);
  }
  if (bytes > maxBytes) {
    await rm(tmp, { force: true });
    throw new Error(`file is too large for GitHub: ${bytes} bytes`);
  }
  const info = await stat(tmp);
  if (!info.size) {
    await rm(tmp, { force: true });
    throw new Error(`empty download for ${ref}`);
  }
  await rename(tmp, destination);
  return { status: "downloaded", bytes: info.size, contentType, sourceUrl: effectiveUrl };
}

function compactDownloadError(error) {
  const message = String(error?.message || error);
  const http = message.match(/returned error:\s*(\d+)/i);
  if (http) return `HTTP ${http[1]}`;
  if (/timed out/i.test(message)) return "timeout";
  if (/SSL/i.test(message)) return "SSL connection error";
  if (/Wayback returned HTML/i.test(message)) return "Wayback returned HTML";
  if (/empty download/i.test(message)) return "empty download";
  return message.split(/\r?\n/).filter(Boolean).pop() || "download failed";
}

async function restoreImage(ref) {
  const existing = await fileStatus(ref);
  if (existing.status === "existing") return { ref, ...existing };
  if (!shouldDownload) return { ref, status: existing.status };

  const urls = [
    { url: waybackDirectUrl(ref, "www.vie.group"), timestamp: "0", original: `http://www.vie.group/${ref}` },
    { url: waybackDirectUrl(ref, "vie.group"), timestamp: "0", original: `http://vie.group/${ref}` }
  ];
  const candidates = useCdx ? await cdxCandidates(ref) : [];
  urls.unshift(
    ...candidates.map((candidate) => ({
      url: `https://web.archive.org/web/${candidate.timestamp}id_/${encodeURI(candidate.original)}`,
      timestamp: candidate.timestamp,
      original: candidate.original,
      mimetype: candidate.mimetype
    }))
  );

  const errors = [];
  for (const candidate of urls) {
    try {
      const result = await downloadCandidate(ref, candidate.url);
      return { ref, ...result, timestamp: candidate.timestamp, original: candidate.original, mimetype: candidate.mimetype };
    } catch (error) {
      await rm(`${path.resolve(ref)}.download`, { force: true }).catch(() => {});
      errors.push({ sourceUrl: candidate.url, error: compactDownloadError(error) });
    }
  }

  return {
    ref,
    status: "failed",
    candidates: candidates.length,
    error: errors[0]?.error || (useCdx ? "No Wayback candidates found" : "Direct Wayback restore failed; retry with --cdx for exhaustive search"),
    attempts: errors
  };
}

async function runQueue(refs) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < refs.length) {
      const ref = refs[index];
      index += 1;
      const item = await restoreImage(ref);
      results.push(item);
      console.log(`${item.status.padEnd(10)} ${ref}${item.bytes ? ` (${item.bytes} bytes)` : ""}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, refs.length) }, () => worker()));
  return results.sort((a, b) => a.ref.localeCompare(b.ref));
}

const html = await readFile(activityPath, "utf8");
const activities = extractActivities(html);
if (!activities.length) throw new Error(`No activity details found in ${activityPath}.`);

await writeFile(detailsPath, `${JSON.stringify(activities, null, 2)}\n`, "utf8");

const refs = [...new Set(activities.flatMap((activity) => activity.images))].sort();
const manifest = await runQueue(refs);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const downloaded = manifest.filter((item) => item.status === "downloaded").length;
const existing = manifest.filter((item) => item.status === "existing").length;
const failed = manifest.filter((item) => item.status === "failed").length;
console.log(`Archived ${activities.length} activity details.`);
console.log(`Images: existing=${existing}, downloaded=${downloaded}, failed=${failed}`);
