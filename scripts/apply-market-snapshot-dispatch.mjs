import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMarketSnapshot } from "./market-snapshot-validation.mjs";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const snapshotPath = path.join(projectRoot, "public", "market-snapshot.json");
const dryRun = process.env.DRY_RUN === "true";

const snapshot = await readSnapshotInput();
validateMarketSnapshot(snapshot);

if (dryRun) {
  console.log(`Validated dispatched market snapshot without writing: ${snapshot.dataCutLabel}`);
} else {
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Applied dispatched market snapshot: ${snapshot.dataCutLabel}`);
}

async function readSnapshotInput() {
  if (process.env.MARKET_SNAPSHOT_JSON?.trim()) {
    return JSON.parse(process.env.MARKET_SNAPSHOT_JSON);
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error("GITHUB_EVENT_PATH was not provided");

  const event = JSON.parse(await readFile(eventPath, "utf8"));
  const payload = event.client_payload ?? {};

  if (payload.snapshot && typeof payload.snapshot === "object") return payload.snapshot;
  if (typeof payload.snapshot_json === "string") return JSON.parse(payload.snapshot_json);
  if (typeof payload.snapshot_base64 === "string") {
    return JSON.parse(Buffer.from(payload.snapshot_base64, "base64").toString("utf8"));
  }

  throw new Error("No market snapshot payload was provided. Send client_payload.snapshot, snapshot_json or snapshot_base64.");
}
