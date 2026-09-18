# GitHub Copilot instructions

## Project objective

Build and operate the Connect Logistics Chrome Market Analyser as a Microsoft-first internal application. The production target is Azure Static Web Apps with Microsoft Entra authentication, Azure Functions, Microsoft Graph, SharePoint and Power Automate. Do not add a dependency on OpenAI Sites or ChatGPT authentication.

## Before making changes

1. Read `README.md` and `AZURE-DEPLOYMENT.md`.
2. Inspect `app/dashboard.tsx`, `app/market-data.ts`, `api/market/index.js` and `public/staticwebapp.config.json`.
3. Preserve the distinction between observed, indicated and modelled values.
4. Never place credentials, deployment tokens or client secrets in code, tests, documentation or browser storage.

## Development standards

- Use TypeScript for frontend code.
- Keep the UI responsive, executive-grade and consistent with the existing dark navy/cyan visual system.
- Keep data provenance visible next to every material metric.
- Prefer small, typed adapters over vendor-specific logic inside dashboard components.
- Validate units explicitly: `Mt` is million metric tonnes, `kt` is thousand tonnes and freight is normally quoted per metric tonne.
- Treat FOT-to-DAP spreads as comparison signals, not automatically as pure freight.
- Make failure and stale-data states visible; never silently replace verified data with an unverified value.
- Preserve safe fallbacks while live Microsoft Graph data is unavailable.

## Verification

Run before committing:

```text
pnpm build:azure
pnpm lint
```

When touching the Graph adapter, test missing configuration, token failure, Graph failure and successful list reads. Do not log access tokens or secrets.

## Collection and scraping policy

- Prefer licensed APIs, official downloads, monitored inboxes and deliberate SharePoint uploads.
- Respect robots rules, terms and real publication cadence.
- Cache, hash and deduplicate documents.
- Stop on 401, 403, 429 or CAPTCHA.
- Never add proxy rotation, fingerprint spoofing, CAPTCHA solving or access-control bypasses.

## Immediate priorities

1. Deploy the current Azure build.
2. Configure protected Azure application settings.
3. Complete the site-specific `Sites.Selected` grant only with administrator approval.
4. Resolve the SharePoint site and list IDs.
5. Connect dashboard state to `/api/market` with a visible verified-snapshot fallback.
6. Add data freshness monitoring and tests.
