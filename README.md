# Chrome Market Analyser

An internal Connect Logistics market-intelligence tool for South African chrome ore. It combines verified market observations, chrome pricing and basis comparisons, ocean freight, road-transport modelling, historical context and scenario forecasts.

This repository is the handoff point for GitHub Copilot and future development. The intended production platform is **Microsoft Azure + Entra ID + SharePoint + Power Automate**. OpenAI Sites / `gpt.site` is retained only as a temporary legacy fallback and is not the target architecture.

## Current status — 18 September 2026

- The complete dashboard interface is implemented and visually verified.
- The standalone Azure/Vite production build passes.
- Entra-authenticated Azure Static Web Apps routing is configured.
- A protected Azure Functions adapter is scaffolded for Microsoft Graph and SharePoint.
- An Azure DevOps deployment pipeline is included.
- SharePoint intake, observations, transport quotes and refresh-log structures exist.
- The Power Automate flow **Chrome Market - Intake Audit** records new intake documents in the refresh log.
- Production Graph credentials, exact SharePoint list IDs and the Azure resource still need to be configured.
- Dashboard market values remain a verified static snapshot until the Graph adapter is connected.

## Architecture

```text
Broker files / public documents / carrier quotes
                    |
                    v
        SharePoint Chrome Market Intake
                    |
                    v
              Power Automate
                    |
          +---------+----------+
          |                    |
          v                    v
Market Observations     Transport Quotes
          |                    |
          +---------+----------+
                    |
                    v
       Azure Functions Graph adapter
                    |
                    v
       Azure Static Web Apps dashboard
                    |
                    v
          Microsoft Entra sign-in
```

## Technology

- React 19 and TypeScript
- Vite standalone Azure build
- Tailwind CSS
- Recharts
- Azure Static Web Apps
- Azure Functions
- Microsoft Entra ID
- Microsoft Graph
- SharePoint Online
- Power Automate

## Local setup

Requirements: Node.js 22 or newer and pnpm.

```powershell
pnpm install
pnpm dev:azure
```

Open `http://localhost:5173`.

Production checks:

```powershell
pnpm build:azure
pnpm lint
```

The Azure build output is written to `azure-dist/` and is intentionally excluded from Git.

## Important files

| Path | Purpose |
| --- | --- |
| `app/dashboard.tsx` | Main analyser interface and interactive models |
| `app/market-data.ts` | Audited snapshot data, transport lanes and connector catalogue |
| `azure/main.tsx` | Standalone Azure application entry point |
| `vite.azure.config.ts` | Azure/Vite build configuration |
| `public/staticwebapp.config.json` | Entra access, SPA fallback and security headers |
| `api/health/` | Azure health endpoint |
| `api/market/` | Server-side Microsoft Graph and SharePoint adapter |
| `azure-pipelines.yml` | Azure DevOps build and deployment pipeline |
| `AZURE-DEPLOYMENT.md` | Detailed Microsoft deployment instructions |

## Microsoft resources

Tenant:

- Tenant ID: `328838f1-3214-4e14-9263-47b9595e3f64`
- SharePoint site: <https://connectlogisticscoza.sharepoint.com/sites/ProcessOptimizationandDevelopment>
- Power Automate environment: `Default-328838f1-3214-4e14-9263-47b9595e3f64`

Preferred unattended identity:

- App: `YMS - SharePoint API`
- Client ID: `136f1446-0a92-4947-99c1-574e0dc3021a`
- Permission model: Microsoft Graph `Sites.Selected` application permission
- Required production change: grant this app access only to the Process Optimization and Development site

Do not commit or paste the client secret into this repository, Copilot chat, frontend code or pipeline YAML. Store it only in Azure application settings or Key Vault.

The broader `Connect Logistics AI Hub` app uses delegated permissions and should remain an interactive identity rather than the unattended collector.

## SharePoint system of record

- [Chrome Market Intake](https://connectlogisticscoza.sharepoint.com/sites/ProcessOptimizationandDevelopment/Chrome%20Market%20Intake/Forms/AllItems.aspx)
- [Chrome Market Observations](https://connectlogisticscoza.sharepoint.com/sites/ProcessOptimizationandDevelopment/Lists/Chrome%20Market%20Observations/AllItems.aspx)
- [Chrome Transport Quotes](https://connectlogisticscoza.sharepoint.com/sites/ProcessOptimizationandDevelopment/Lists/Chrome%20Transport%20Quotes/AllItems.aspx)
- [Chrome Refresh Log](https://connectlogisticscoza.sharepoint.com/sites/ProcessOptimizationandDevelopment/Lists/Chrome%20Refresh%20Log/AllItems.aspx)

## Azure configuration

Create a private Azure Static Web App and configure:

- App location: `/`
- Build command: `pnpm build:azure`
- Output location: `azure-dist`
- API location: `api`
- Node.js: 20 or newer

Required server-side application settings:

```text
ENTRA_TENANT_ID
ENTRA_CLIENT_ID
ENTRA_CLIENT_SECRET
GRAPH_SITE_ID
GRAPH_OBSERVATIONS_LIST_ID
GRAPH_TRANSPORT_LIST_ID
```

For Azure DevOps, store the deployment token as the secret variable:

```text
AZURE_STATIC_WEB_APPS_API_TOKEN
```

## GitHub handoff

This folder has full Git history but deliberately has no remote configured. After creating a private GitHub repository, connect it with:

```powershell
git remote add origin https://github.com/<organisation>/<repository>.git
git push -u origin main
```

Recommended repository name: `chrome-market-analyser`.

## Next implementation tasks

1. Create the private GitHub or Azure DevOps repository and push `main`.
2. Create an Azure Static Web Apps resource in the Connect Logistics subscription.
3. Add the protected Azure application settings listed above.
4. Obtain explicit administrator approval immediately before granting the YMS app site-specific access.
5. Resolve the Graph site and list IDs and test `/api/health` followed by `/api/market`.
6. Replace static snapshot values in the dashboard with validated API results and retain the static snapshot as a visible fallback.
7. Build parser/OCR and publishing flows, including content hashes, parser versions and quarantine handling.
8. Add unit tests for field normalization, transport calculations and forecast boundaries.
9. Add monitoring for stale data, failed refreshes and source-confidence changes.
10. Retire the legacy `gpt.site` deployment only after Entra sign-in and live data refresh have been verified.

## Data and modelling notes

- `5.318 Mt` means **5.318 million metric tonnes**.
- FOT-to-DAP basis differences are not automatically pure road freight; they may contain handling, quality, timing and commercial-basis differences.
- Transport estimates should be checked against carrier RFQs and executed invoice history.
- Free official sources include DMPR fuel prices, SANRAL toll tariffs, SARS trade data and UN Comtrade.
- Optional licensed adapters include Fastmarkets, S&P Commodity Insights, SMM, Azure Maps and TollGuru.

## Collection policy

- Respect source terms, robots rules and publication cadence.
- Cache responses and use `ETag`, `Last-Modified` and content hashes where available.
- Use an honest collector identity and conservative per-domain request budgets.
- Stop on `401`, `403`, `429` or CAPTCHA and route the item for deliberate manual upload.
- Do not rotate proxies, spoof fingerprints, bypass access controls or scrape paid content without a licence.

## Disclaimer

Market intelligence only. Values are not tradable quotes or financial advice. Verify grade, moisture, sizing, basis, taxes, logistics terms and contractual conditions before execution.
