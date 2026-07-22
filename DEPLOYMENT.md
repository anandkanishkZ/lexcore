# Deployment

This repo deploys to a single VPS (`v1.zwickytechnology.com` for the backend, `cms.zwickytechnology.com` for the frontend) via GitHub Actions.

## Branch flow

```
Sprint-N (feature work) --PR--> dev --PR--> main
```

- Feature work happens on `Sprint-N` branches (or any topic branch).
- Open a PR into `dev` first. CI (typecheck, backend tests, frontend build) runs on every push and PR to any branch.
- Once verified on `dev`, open a second PR from `dev` into `main`.
- **Merging into `main` is what ships it** — the `deploy` job only runs on a push to `main`, and only after both CI jobs pass.

Avoid pushing or merging directly to `main` — it should only ever receive code through a `dev` → `main` PR, so `main` always reflects exactly what's live.

## What the deploy job does

On every push to `main` (after CI passes), `.github/workflows/ci-cd.yml`'s `deploy` job SSHes into the VPS and runs:

```
cd ~/apps/lexcore
git checkout main
git pull origin main

cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build

pm2 restart lexcore-backend lexcore-frontend
```

This is the same sequence that was previously run by hand.

## Required GitHub secrets

Set under the repo's Settings → Secrets and variables → Actions:

- `VPS_HOST` — the VPS's IP address
- `VPS_USER` — the SSH user (`azureuser`)
- `VPS_SSH_KEY` — the private half of the SSH key already authorized on the VPS
