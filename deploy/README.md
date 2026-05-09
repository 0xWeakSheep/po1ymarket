# Backend Deployment

This repository ships a GitHub-first backend delivery flow:

- `backend-ci.yml`: install, test, and build the NestJS backend
- `backend-deploy.yml`: build locally in GitHub Actions, upload the release, and restart the backend over SSH with `pm2`

## Required GitHub setup

Create two GitHub Environments if you want approval gates:

- `staging`
- `production`

Add these Environment secrets for each target:

- `SSH_HOST`
- `SSH_USER`
- `SSH_KEY`
- `SSH_PORT` optional, defaults to `22`
- `DEPLOY_PATH` remote directory that stores releases and `.env`

Add these optional Environment variables:

- `BACKEND_PM2_NAME`

## Remote server layout

The deploy workflow expects this structure on the server:

```text
$DEPLOY_PATH/
  .env
  current -> releases/<sha>
  releases/
```

The workflow uploads a release tarball to `/tmp`, expands it into `$DEPLOY_PATH/releases/<sha>`, and repoints `$DEPLOY_PATH/current`. You are responsible for creating `.env`.

## Server prerequisites

Install these on the server before the first deploy:

- Node.js 20
- npm
- `pm2`

Example:

```bash
npm install -g pm2
pm2 startup
```

## Minimal remote `.env`

```bash
PORT=3000
PO1MARKET_CORS_ORIGIN=https://your-frontend.example.com
PO1MARKET_OPENAI_API_KEY=...
PO1MARKET_OPENAI_MODEL=gpt-4.1-mini
```
