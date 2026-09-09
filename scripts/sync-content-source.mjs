import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const sourceDir = process.env.CONTENT_SOURCE_DIR || ".content-source";
const dataDir = join(sourceDir, "data");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function syncData() {
  if (!(await exists(join(dataDir, "site.json")))) {
    throw new Error(`Content source data directory was not found: ${dataDir}`);
  }

  await mkdir("data", { recursive: true });
  const entries = await readdir(dataDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    await cp(join(dataDir, entry.name), join("data", entry.name));
  }
}

async function updateLocalContentSource() {
  const config = await readJson("content-source.json");
  const sourceConfigPath = join(sourceDir, "content.config.json");
  if (await exists(sourceConfigPath)) {
    const sourceConfig = await readJson(sourceConfigPath);
    if (sourceConfig.contentRepository && sourceConfig.contentRepository !== config.repository) {
      throw new Error(
        `Content repository mismatch: site expects ${config.repository}, source says ${sourceConfig.contentRepository}`
      );
    }
  }
  await writeFile("content-source.json", `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

await syncData();
await updateLocalContentSource();
if (!process.env.CONTENT_SOURCE_DIR || sourceDir === ".content-source") {
  await rm(sourceDir, { recursive: true, force: true });
}
console.log(`Synced content data from ${sourceDir}.`);
