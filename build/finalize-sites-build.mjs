import { access, copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const root = process.cwd();
const dist = resolve(root, "dist");
const packageMetadata = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const entries = await readdir(dist, { withFileTypes: true });
const candidates = [];

for (const entry of entries) {
  if (!entry.isDirectory() || ["client", "server", ".openai"].includes(entry.name)) {
    continue;
  }

  const workerEntry = resolve(dist, entry.name, "index.js");
  const workerConfig = resolve(dist, entry.name, "wrangler.json");
  if ((await exists(workerEntry)) && (await exists(workerConfig))) {
    const workerMetadata = JSON.parse(await readFile(workerConfig, "utf8"));
    candidates.push({
      directory: resolve(dist, entry.name),
      workerEntry,
      workerConfig,
      workerName: workerMetadata.topLevelName,
    });
  }
}

const selected = candidates.filter(({ workerName }) => workerName === packageMetadata.name);
if (selected.length !== 1) {
  throw new Error(
    `Expected one Cloudflare worker build for ${packageMetadata.name}, found ${selected.length}`,
  );
}

const serverDirectory = resolve(dist, "server");
const metadataDirectory = resolve(dist, ".openai");
await mkdir(serverDirectory, { recursive: true });
await mkdir(metadataDirectory, { recursive: true });
await copyFile(selected[0].workerEntry, resolve(serverDirectory, "index.js"));
await copyFile(selected[0].workerConfig, resolve(serverDirectory, "wrangler.json"));
await copyFile(
  resolve(root, ".openai", "hosting.json"),
  resolve(metadataDirectory, "hosting.json"),
);

await Promise.all(
  candidates
    .filter(({ directory }) => directory !== selected[0].directory)
    .map(({ directory }) => rm(directory, { recursive: true, force: true })),
);
