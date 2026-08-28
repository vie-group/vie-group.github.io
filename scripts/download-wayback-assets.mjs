import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFiles = ["data/publications.json", "data/seminars.json"];
const maxRedirects = 8;
const maxBytes = 95 * 1024 * 1024;
const concurrency = 3;

function collectRefs(value, refs = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectRefs(item, refs));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectRefs(item, refs));
  } else if (typeof value === "string" && value.startsWith("media/")) {
    refs.add(value);
  }
  return refs;
}

async function readRefs() {
  const refs = new Set();
  for (const file of dataFiles) {
    const json = JSON.parse(await readFile(path.join(root, file), "utf8"));
    collectRefs(json, refs);
  }
  return [...refs].sort();
}

function archiveUrl(ref) {
  return `https://web.archive.org/web/0id_/http://www.vie.group/${encodeURI(ref)}`;
}

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    const request = client.get(
      url,
      {
        headers: {
          "User-Agent": "vie-group.github.io asset recovery"
        },
        timeout: 120000
      },
      (response) => {
        const location = response.headers.location;
        if ([301, 302, 303, 307, 308].includes(response.statusCode) && location) {
          response.resume();
          if (redirects >= maxRedirects) {
            reject(new Error(`too many redirects for ${url}`));
            return;
          }
          resolve(get(new URL(location, url).toString(), redirects + 1));
          return;
        }
        resolve(response);
      }
    );
    request.on("timeout", () => {
      request.destroy(new Error(`timeout for ${url}`));
    });
    request.on("error", reject);
  });
}

async function download(ref) {
  const destination = path.join(root, ref);
  const tmp = `${destination}.download`;
  await mkdir(path.dirname(destination), { recursive: true });

  try {
    const existing = await stat(destination);
    if (existing.size > 0) {
      return { ref, status: "skipped", bytes: existing.size };
    }
  } catch (_) {
    // Missing file; continue.
  }

  const response = await get(archiveUrl(ref));
  const contentType = String(response.headers["content-type"] || "");
  const contentLength = Number(response.headers["content-length"] || 0);

  if (response.statusCode !== 200) {
    response.resume();
    throw new Error(`HTTP ${response.statusCode}`);
  }
  if (contentLength > maxBytes) {
    response.resume();
    throw new Error(`file is too large for GitHub: ${contentLength} bytes`);
  }
  if (/text\/html/i.test(contentType)) {
    response.resume();
    throw new Error("Wayback returned HTML instead of a file");
  }

  let bytes = 0;
  await new Promise((resolve, reject) => {
    const file = createWriteStream(tmp);
    response.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        response.destroy(new Error(`file is too large for GitHub: ${bytes} bytes`));
      }
    });
    response.pipe(file);
    file.on("finish", () => file.close(resolve));
    file.on("error", reject);
    response.on("error", reject);
  });
  await rename(tmp, destination);
  return { ref, status: "downloaded", bytes, contentType };
}

async function runQueue(refs) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < refs.length) {
      const ref = refs[index++];
      try {
        const result = await download(ref);
        results.push(result);
        console.log(`${result.status.padEnd(10)} ${String(result.bytes).padStart(10)} ${ref}`);
      } catch (error) {
        await rm(path.join(root, `${ref}.download`), { force: true }).catch(() => {});
        const result = { ref, status: "failed", error: error.message };
        results.push(result);
        console.log(`${result.status.padEnd(10)} ${ref} :: ${result.error}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results.sort((a, b) => a.ref.localeCompare(b.ref));
}

const refs = await readRefs();
console.log(`Found ${refs.length} local media references.`);
const results = await runQueue(refs);
await writeFile(path.join(root, "data", "asset-manifest.json"), `${JSON.stringify(results, null, 2)}\n`, "utf8");

const downloaded = results.filter((item) => item.status === "downloaded").length;
const skipped = results.filter((item) => item.status === "skipped").length;
const failed = results.filter((item) => item.status === "failed");
console.log(`Done. downloaded=${downloaded}, skipped=${skipped}, failed=${failed.length}`);
if (failed.length) {
  console.log("Failed assets:");
  failed.forEach((item) => console.log(`- ${item.ref}: ${item.error}`));
  process.exitCode = 1;
}
