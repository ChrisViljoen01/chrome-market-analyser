const REQUIRED_SETTINGS = [
  "ENTRA_TENANT_ID",
  "ENTRA_CLIENT_ID",
  "ENTRA_CLIENT_SECRET",
  "GRAPH_SITE_ID",
  "GRAPH_OBSERVATIONS_LIST_ID",
  "GRAPH_TRANSPORT_LIST_ID",
];

function json(status, body, cacheControl = "no-store") {
  return {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": cacheControl,
    },
    body,
  };
}

async function getGraphToken() {
  const tenantId = process.env.ENTRA_TENANT_ID;
  const body = new URLSearchParams({
    client_id: process.env.ENTRA_CLIENT_ID,
    client_secret: process.env.ENTRA_CLIENT_SECRET,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`Token request failed (${response.status})`);
  return (await response.json()).access_token;
}

async function readList(token, listId) {
  const siteId = encodeURIComponent(process.env.GRAPH_SITE_ID);
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${encodeURIComponent(listId)}/items?$expand=fields&$top=500`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Graph list request failed (${response.status})`);
  const payload = await response.json();
  return payload.value.map((item) => ({ id: item.id, ...item.fields }));
}

module.exports = async function market(context) {
  const missing = REQUIRED_SETTINGS.filter((name) => !process.env[name]);
  if (missing.length) {
    context.res = json(503, {
      status: "not_configured",
      message: "The SharePoint adapter is waiting for Azure application settings.",
      missing,
    });
    return;
  }

  try {
    const token = await getGraphToken();
    const [observations, transportQuotes] = await Promise.all([
      readList(token, process.env.GRAPH_OBSERVATIONS_LIST_ID),
      readList(token, process.env.GRAPH_TRANSPORT_LIST_ID),
    ]);
    context.res = json(200, {
      generatedAt: new Date().toISOString(),
      observations,
      transportQuotes,
    }, "private, max-age=300");
  } catch (error) {
    context.log.warn("SharePoint market adapter failed", error instanceof Error ? error.message : "Unknown error");
    context.res = json(502, {
      status: "source_unavailable",
      message: "SharePoint market data could not be refreshed.",
    });
  }
};
