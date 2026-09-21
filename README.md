# Chrome Market Analyser

The Connect Logistics Chrome Market Analyser is a reviewable market-intelligence interface for South African chrome ore. It combines verified market observations, chrome pricing and basis comparisons, ocean freight, road-transport modelling, historical context and scenario forecasts.

The current public deployment is a **static GitHub Pages review build**. It uses the audited snapshot in `app/market-data.ts`; it does not connect to SharePoint, Microsoft Graph or Entra ID and it does not contain credentials.

## Current status — 21 September 2026

- The complete dashboard interface is implemented and visually verified.
- The standalone Vite build is ready for GitHub Pages stakeholder review.
- Dashboard market values are a verified snapshot with individually timestamped inputs; the current SMM CIF benchmark is dated 21 September 2026.
- The optional Microsoft Graph/SharePoint adapter remains isolated under `api/` for a future private backend.
- No Entra, Graph, SharePoint or client-secret configuration is required for the public review site.

## Review architecture

```text
GitHub repository
       |
       v
GitHub Actions
       |
       v
Static Vite build
       |
       v
GitHub Pages
```

The future private production architecture can add a server-side adapter such as Azure Functions, AWS Lambda or another approved backend. Secrets must remain in that backend and must never be placed in the public repository or browser.

## Technology

- React 19 and TypeScript
- Vite standalone build
- Tailwind CSS
- Recharts
- GitHub Actions and GitHub Pages for review deployment

## GitHub Pages deployment

The workflow in `.github/workflows/deploy-pages.yml` builds the app with `pnpm build:azure` and deploys `azure-dist` to GitHub Pages whenever `main` changes.
It also runs daily at **12:00 SAST** (`10:00 UTC`) and can be started immediately from **Actions → Deploy review site → Run workflow**.

Each run executes `scripts/refresh-market-data.mjs` before the build. The script checks official public/reference pages and writes `public/market-refresh.json`, which is displayed in the dashboard's **Data Ops** tab. SMM, LCB, Nexus and Fastmarkets values remain manual or licensed inputs until an approved feed or written permission is available; the workflow does not scrape or republish restricted market data.

The market values used by the dashboard live in `public/market-snapshot.json`. Power Automate, a secure backend, or a reviewed manual process can update that JSON file, then the workflow validates it with `scripts/validate-market-snapshot.mjs` and publishes the site. This keeps credentials out of GitHub Pages while still allowing the dashboard to be populated automatically from an approved upstream process.

Port-level chrome export flows are separated into `public/port-flows.json`. The current file intentionally contains no tonnage rows because Maputo, Richards Bay and Durban origin/tonnage data has not yet been verified from an approved internal, terminal, agent or licensed source. The **Port flows** tab shows that gap explicitly and lists the required data requests instead of filling the dashboard with unverified public article values.

Recommended Power Automate flow:

1. Collect approved files, emails or licensed feed outputs.
2. Normalize them into `market-snapshot.json`.
3. Preserve source type as `Observed`, `Indication`, `Modelled` or `Reference`.
4. Send the JSON to GitHub using the **Ingest market snapshot** workflow.
5. Let GitHub validate, commit and deploy the updated public site.

Power Automate should use an **HTTP** action:

```text
POST https://api.github.com/repos/ChrisViljoen01/chrome-market-analyser/dispatches
Authorization: Bearer <Power Automate GitHub token>
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
Content-Type: application/json
```

Request body:

```json
{
  "event_type": "market_snapshot",
  "client_payload": {
    "snapshot": {
      "generatedAt": "2026-09-18T10:00:00.000Z",
      "dataCutLabel": "18 Sep 2026 · 12:00 SAST",
      "asOfIso": "2026-09-18T12:00:00+02:00",
      "currentPriceUsdPerDmt": 282.5,
      "fxUsdZar": 16.27,
      "forecastInputs": {
        "inventoryWoW": 1.89,
        "freight": 35.5,
        "fx": 16.27,
        "exportGrowth": 10.3,
        "tenderChange": -100
      },
      "metrics": [
        {
          "label": "SA 40–42 CIF",
          "value": "$282.50",
          "delta": "0%",
          "detail": "Approved snapshot",
          "sentiment": "neutral",
          "source": "Observed"
        }
      ],
      "marketEvents": [
        { "date": "18 Sep", "event": "Approved market snapshot", "value": "$282.50/dmt", "impact": "Reference" }
      ],
      "priceHistory": [
        { "month": "Sep", "observed": 282.5, "base": 282.5, "bull": 282.5, "bear": 282.5 }
      ]
    }
  }
}
```

If it is easier in Power Automate, send `"snapshot_base64": "<base64 JSON>"` inside `client_payload` instead of the nested `snapshot` object.

In production, populate `metrics`, `marketEvents` and `priceHistory` with the complete arrays matching `public/market-snapshot.json`, not just the minimal example above. The token belongs only in Power Automate's secure connection/secret storage, not in the repository, browser or `.env` file.

In the repository settings:

1. Open **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` or run **Actions → Deploy review site → Run workflow**.

The resulting URL is normally:

```text
https://<github-user>.github.io/<repository-name>/
```

The workflow supplies the repository path as Vite's base path, so assets work when the site is hosted under a project URL.

## Local setup

Requirements: Node.js 22 or newer and pnpm.

```powershell
pnpm install
pnpm dev:azure
```

Open `http://localhost:5173`.

Build checks:

```powershell
pnpm build:azure
pnpm lint
```

The static build output is written to `azure-dist/` and is intentionally excluded from Git. The directory name is retained for compatibility with the existing Vite configuration.

## Important files

| Path | Purpose |
| --- | --- |
| `app/dashboard.tsx` | Main analyser interface and interactive models |
| `app/market-data.ts` | Audited snapshot data, transport lanes and connector catalogue |
| `azure/main.tsx` | Standalone Azure application entry point |
| `vite.azure.config.ts` | Azure/Vite build configuration |
| `.github/workflows/deploy-pages.yml` | Public GitHub Pages build and deployment |
| `public/port-flows.json` | Approved port-level export tonnage records and source worklist |
| `public/staticwebapp.config.json` | Reserved for a future Azure deployment |
| `api/health/` | Azure health endpoint |
| `api/market/` | Server-side Microsoft Graph and SharePoint adapter |
| `azure-pipelines.yml` | Azure DevOps build and deployment pipeline |
| `AZURE-DEPLOYMENT.md` | Detailed Microsoft deployment instructions |

## Future private data connection

The `api/market/` function is not used by GitHub Pages. It is a future server-side adapter that would:

- obtain a Microsoft Graph token using server-side configuration;
- read normalized SharePoint observations and transport quotes; and
- return validated JSON to the dashboard.

The required Entra and Graph settings belong only in the chosen private backend's protected application settings. They must not be added to GitHub Actions, frontend code, `.env` files committed to the repository or browser storage.

## Next implementation tasks

1. Review the public static site with stakeholders.
2. Decide whether the future backend should be Azure, AWS or another approved platform.
3. Define the approved SharePoint/Graph security model with an administrator.
4. Add the private backend and typed dashboard adapter.
5. Build parser/OCR and publishing flows, including content hashes, parser versions and quarantine handling.
6. Add unit tests for field normalization, transport calculations and forecast boundaries.
7. Add monitoring for stale data, failed refreshes and source-confidence changes.

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
