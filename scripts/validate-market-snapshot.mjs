import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMarketSnapshot } from "./market-snapshot-validation.mjs";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const snapshotPath = path.join(projectRoot, "public", "market-snapshot.json");

const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));

validateMarketSnapshot(snapshot);
console.log(`Validated market snapshot: ${snapshot.dataCutLabel}`);
