# Kommo Private Chatbot (Widget + Backend)

This repository contains:

- `widget/`: a Kommo WebSDK widget package for Salesbot Designer.
- `backend/`: a webhook service for `widget_request` that sends continuation data back to Kommo.

## 1. Backend Setup

1. Install dependencies:

```powershell
cd backend
npm install
```

2. Create env file:

```powershell
Copy-Item .env.example .env
```

3. Update `.env` values:

- `KOMMO_SECRET_KEY`: private integration secret key used to verify JWT from Kommo.
- `KOMMO_ACCESS_TOKEN`: OAuth access token used to call Kommo `return_url`.
- `KOMMO_ALLOWED_RETURN_HOSTS`: comma-separated allowlist of hostnames (for example `techxoetic.kommo.com`).

4. Run backend:

```powershell
npm run start
```

Backend routes:

- `GET /health`
- `POST /kommo/widget-request`

`POST /kommo/widget-request` immediately replies `200` and then asynchronously:

- verifies `token` (HS256),
- builds a bot response (currently echo behavior),
- POSTs result to Kommo `return_url` with `data` and `execute_handlers`.

## 2. Deploy Backend (HTTPS)

Deploy backend so Kommo can call:

- `https://<your-public-domain>/kommo/widget-request`

Docker image build example:

```powershell
cd backend
docker build -t kommo-private-chatbot-backend .
```

Run container example:

```powershell
docker run --rm -p 3000:3000 --env-file .env kommo-private-chatbot-backend
```

After deployment, validate:

- `GET https://<your-public-domain>/health` returns `{"ok":true}`.

## 3. Widget Setup

1. `widget/manifest.json` defaults are prefilled:

- support link/email
- Salesbot block webhook default URL
- install setting `default_webhook_url`

2. If your backend URL differs, update:

- `salesbot_designer.private_chatbot_handler.settings.webhook_url.default_value`
- `settings.default_webhook_url.default_value`

3. Optional global setting:

- install settings include `default_webhook_url`.

4. In Salesbot Designer block:

- set `webhook_url` to your backend endpoint (for example `https://api.techxoetic.com/kommo/widget-request`).

The widget sends:

- `message` = `{{message_text}}`,
- lead/contact identifiers when available.

The widget branches to:

- `success` exit if backend returns `data.status = success`,
- `fail` exit otherwise.

## 4. Build Widget Zip

Create an uploadable archive:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package-widget.ps1
```

Output:

- `dist/kommo-private-chatbot-widget.zip`

The archive contains widget files at the root level, ready for Kommo upload.

## 5. Upload and Configure in Kommo

1. Upload `dist/kommo-private-chatbot-widget.zip` in Kommo widgets.
2. Install the widget.
3. Open Salesbot Designer and add the widget block.
4. Confirm block webhook URL points to your deployed backend.
5. Connect block exits:
   - `success` -> normal flow
   - `fail` -> fallback flow

## 6. Validation Scenarios

Run automated backend tests:

```powershell
cd backend
npm test
```

Scenarios covered:

- health check
- invalid JWT returns 401 and does not continue Salesbot
- invalid return URL host returns 400
- valid request returns immediate 200 and sends continuation
- primary continuation failure triggers failover continuation payload

## 7. Hardening

- Keep `KOMMO_ALLOWED_RETURN_HOSTS` strict in production.
- Rotate tokens if shared outside secure channels.
- Correlated request logging is included (`request_id`, `account_id`, `lead_id`, `contact_id`).

## 8. Zoho CRM Integration Point

Integrate Zoho logic in:

- `backend/src/response-builder.js`

Replace `buildBotResponse()` echo logic with:

- Zoho lookup/upsert,
- business decisioning,
- final text/buttons payload for Salesbot continuation.
