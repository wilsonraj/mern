# GitHub Actions CI/CD with Render

The workflow in `.github/workflows/ci-cd.yml` checks pull requests targeting
`main`. After a successful check, each push to `main` triggers the matching
Render service deployment. The backend and frontend deploy independently.

## Configure the Render services

Create two Render services from this repository:

For both services, select the `main` branch and disable Render's automatic
deploy-on-commit setting; GitHub Actions will trigger deployments through the
deploy hooks after CI passes.

### Backend web service

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/health`
- Set `NODE_ENV` to `production`.
- Set `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `FRONTEND_URL` in the
  service environment. Use a production MongoDB URI, distinct strong JWT
  secrets, and the deployed frontend's origin for `FRONTEND_URL`.
- Add optional backend-only OAuth and payment credentials in Render if those
  features are enabled. Never put backend secrets in the frontend environment.
- Feed images are stored in `backend/src/uploads/feed`. Render's local
  filesystem is ephemeral by default, so configure persistent storage for this
  path or use external object storage if uploaded images must survive deploys.

### Frontend static site

- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Set `VITE_API_BASE_URL` to the backend URL ending in `/api` in the Render
  service's build environment. Add the public OAuth client IDs there only if
  the corresponding sign-in methods are enabled.
- Add a rewrite from `/*` to `/index.html` so client-side routes work on refresh.

## Connect GitHub Actions to Render

For each Render service, create a deploy hook in its settings. In the GitHub
repository, open **Settings → Secrets and variables → Actions** and add:

- `RENDER_BACKEND_DEPLOY_HOOK` — the backend service's deploy hook URL
- `RENDER_FRONTEND_DEPLOY_HOOK` — the frontend service's deploy hook URL

Keep the hook URLs in GitHub Actions secrets; do not commit them. Pull requests
run checks but do not deploy. A deployment will fail clearly if its hook secret
has not been configured.
