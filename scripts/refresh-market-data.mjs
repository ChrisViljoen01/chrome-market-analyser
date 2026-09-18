import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputPath = path.join(projectRoot, "public", "market-refresh.json");

const checkedSources = [
  {
    id: "sars",
    label: "SARS trade statistics",
    url: "https://www.sars.gov.za/customs-and-excise/trade-statistics/",
    detail: "Official customs publication page for South African trade statistics.",
  },
  {
    id: "dmpr-fuel",
    label: "DMPR fuel prices",
    url: "https://www.dmpr.gov.za/Services/Petroleum-Resources/Fuel-Prices",
    detail: "Official fuel-price update page used for road-cost surcharge context.",
  },
  {
    id: "sanral-tolls",
    label: "SANRAL toll tariffs",
    url: "https://www.gov.za/documents/notices/south-african-national-roads-agency-limited-and-national-roads-act-toll-tariffs",
    detail: "Official government notice page for national toll tariff references.",
  },
  {
    id: "itac",
    label: "ITAC export-control policy",
    url: "https://www.gov.za/documents/notices/international-trade-administration-act-placing-chrome-ore-under-export-control-0",
    detail: "Official government notice page for chrome export-control policy monitoring.",
  },
];

const manualSources = [
  {
    id: "smm-price",
    label: "SMM chrome ore price assessment",
    status: "manual_required",
    detail: "SMM prices require approved use or a licensed feed before automated republication.",
  },
  {
    id: "smm-news",
    label: "SMM inventory and export articles",
    status: "manual_required",
    detail: "SMM article values remain manual/licensed inputs because the public page terms restrict copying/reproduction.",
  },
  {
    id: "lcb-nexus",
    label: "LCB / Nexus broker and freight indications",
    status: "manual_required",
    detail: "Broker sheets and freight indications must be supplied by approved email, file upload or licensed feed.",
  },
  {
    id: "fastmarkets",
    label: "Fastmarkets chrome benchmark",
    status: "manual_required",
    detail: "Fastmarkets benchmark values require a licensed delivery channel; only methodology references are public.",
  },
];

async function main() {
  const generatedAt = new Date().toISOString();
  const checked = await Promise.all(checkedSources.map(checkSource));
  const available = checked.filter((source) => source.status === "checked").length;
  const failed = checked.length - available;

  const payload = {
    generatedAt,
    status: failed ? "partial" : "checked",
    summary: failed
      ? `${available}/${checked.length} official public sources checked; market prices remain manual/licensed.`
      : `${available}/${checked.length} official public sources checked; market prices remain manual/licensed.`,
    dataMode: "manual_market_snapshot_with_public_source_checks",
    updatedMetrics: [],
    sources: [...checked, ...manualSources],
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(payload.summary);
}

async function checkSource(source) {
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "ConnectLogisticsChromeMarketAnalyser/1.0 (+https://github.com/ChrisViljoen01/chrome-market-analyser)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if ([401, 403, 429].includes(response.status)) {
      return {
        ...source,
        status: "blocked",
        fetchedAt,
        httpStatus: response.status,
        lastObserved: null,
        evidence: `Stopped on HTTP ${response.status}.`,
      };
    }

    if (!response.ok) {
      return {
        ...source,
        status: "failed",
        fetchedAt,
        httpStatus: response.status,
        lastObserved: null,
        evidence: `HTTP ${response.status}.`,
      };
    }

    const body = await response.text();
    if (/captcha|verify you are human|access denied/i.test(body)) {
      return {
        ...source,
        status: "blocked",
        fetchedAt,
        httpStatus: response.status,
        lastObserved: null,
        evidence: "Stopped because the source returned an access-control or CAPTCHA page.",
      };
    }

    const lastObserved =
      getMeta(body, "article:modified_time") ??
      getMeta(body, "og:updated_time") ??
      getMeta(body, "dateModified") ??
      response.headers.get("last-modified");

    return {
      ...source,
      status: "checked",
      fetchedAt,
      httpStatus: response.status,
      lastObserved,
      evidence: lastObserved ? `Published/modified marker: ${lastObserved}` : "Source reachable; no machine-readable date marker found.",
    };
  } catch (error) {
    return {
      ...source,
      status: "failed",
      fetchedAt,
      httpStatus: null,
      lastObserved: null,
      evidence: error instanceof Error ? error.message : "Unknown fetch failure.",
    };
  }
}

function getMeta(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return null;
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
