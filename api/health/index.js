module.exports = async function health(context) {
  context.res = {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: {
      status: "ok",
      service: "chrome-market-api",
      runtime: "azure-static-web-apps",
      time: new Date().toISOString(),
    },
  };
};
