# Microsoft deployment

The Chrome Market Analyser can run without OpenAI Sites or ChatGPT authentication.

## Target architecture

1. Azure Static Web Apps hosts the Vite single-page application in `azure-dist`.
2. Microsoft Entra ID protects every page and API route.
3. The managed API in `api` reads normalized SharePoint lists through Microsoft Graph.
4. Power Automate continues to ingest documents and write the SharePoint audit trail.
5. The `YMS - SharePoint API` registration is the unattended service identity. Grant it access only to the Process Optimization and Development site through `Sites.Selected`.

## Build settings

- App location: `/`
- Build command: `pnpm build:azure`
- Output location: `azure-dist`
- API location: `api`
- Node.js: 20 or newer

## Source and release

Create a private Azure DevOps repository and push this checkout to its `main` branch. The included `azure-pipelines.yml` builds and deploys the app. Add the Azure Static Web Apps deployment token as the secret pipeline variable `AZURE_STATIC_WEB_APPS_API_TOKEN`; do not place the token in YAML or source control.

## Azure application settings

Configure these values in Azure Static Web Apps. Never commit them to source control.

- `ENTRA_TENANT_ID`
- `ENTRA_CLIENT_ID`
- `ENTRA_CLIENT_SECRET`
- `GRAPH_SITE_ID`
- `GRAPH_OBSERVATIONS_LIST_ID`
- `GRAPH_TRANSPORT_LIST_ID`

The client secret is consumed only by the server-side function. It is never sent to the browser.

## Release checks

```text
pnpm build:azure
pnpm lint
```

After deployment, verify `/api/health`, then `/api/market`, and finally confirm that unauthenticated visitors are redirected to Microsoft sign-in.
