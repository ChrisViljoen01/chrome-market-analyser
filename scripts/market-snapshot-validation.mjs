const sentiments = new Set(["negative", "neutral", "positive"]);
const sourceTypes = new Set(["Observed", "Indication", "Modelled", "Reference"]);

export function validateMarketSnapshot(snapshot) {
  assertString(snapshot?.generatedAt, "generatedAt");
  assertString(snapshot?.dataCutLabel, "dataCutLabel");
  assertString(snapshot?.asOfIso, "asOfIso");
  assertNumber(snapshot?.currentPriceUsdPerDmt, "currentPriceUsdPerDmt", 1, 2000);
  assertNumber(snapshot?.fxUsdZar, "fxUsdZar", 1, 100);
  assertForecastInputs(snapshot?.forecastInputs);
  assertArray(snapshot?.metrics, "metrics");
  assertArray(snapshot?.marketEvents, "marketEvents");
  assertArray(snapshot?.priceHistory, "priceHistory");

  for (const [index, metric] of snapshot.metrics.entries()) {
    assertString(metric.label, `metrics[${index}].label`);
    assertString(metric.value, `metrics[${index}].value`);
    assertString(metric.delta, `metrics[${index}].delta`);
    assertString(metric.detail, `metrics[${index}].detail`);
    if (!sentiments.has(metric.sentiment)) throw new Error(`metrics[${index}].sentiment must be negative, neutral or positive`);
    if (!sourceTypes.has(metric.source)) throw new Error(`metrics[${index}].source must preserve observed/indication/modelled/reference provenance`);
  }

  for (const [index, event] of snapshot.marketEvents.entries()) {
    assertString(event.date, `marketEvents[${index}].date`);
    assertString(event.event, `marketEvents[${index}].event`);
    assertString(event.value, `marketEvents[${index}].value`);
    assertString(event.impact, `marketEvents[${index}].impact`);
  }

  for (const [index, point] of snapshot.priceHistory.entries()) {
    assertString(point.month, `priceHistory[${index}].month`);
    for (const key of ["observed", "base", "bull", "bear"]) {
      if (point[key] !== null) assertNumber(point[key], `priceHistory[${index}].${key}`, 0, 5000);
    }
  }
}

function assertForecastInputs(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("forecastInputs must be an object");
  assertNumber(value.inventoryWoW, "forecastInputs.inventoryWoW", -50, 50);
  assertNumber(value.freight, "forecastInputs.freight", 0, 500);
  assertNumber(value.fx, "forecastInputs.fx", 1, 100);
  assertNumber(value.exportGrowth, "forecastInputs.exportGrowth", -100, 100);
  assertNumber(value.tenderChange, "forecastInputs.tenderChange", -5000, 5000);
}

function assertArray(value, name) {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${name} must be a non-empty array`);
}

function assertString(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} must be a non-empty string`);
}

function assertNumber(value, name, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a finite number between ${min} and ${max}`);
  }
}
