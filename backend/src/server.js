const dotenv = require("dotenv");
const { continueSalesbot, verifyWidgetToken } = require("./kommo");
const { buildBotResponse } = require("./response-builder");
const { createApp } = require("./app");

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const KOMMO_SECRET_KEY = process.env.KOMMO_SECRET_KEY;
const KOMMO_ACCESS_TOKEN = process.env.KOMMO_ACCESS_TOKEN;
const KOMMO_CONTINUE_TIMEOUT_MS = Number(process.env.KOMMO_CONTINUE_TIMEOUT_MS || 10000);
const KOMMO_ALLOWED_RETURN_HOSTS = process.env.KOMMO_ALLOWED_RETURN_HOSTS || "";

function requireEnv(name, value) {
  if (!value) {
    throw new Error("Missing required environment variable: " + name);
  }
}

function start() {
  requireEnv("KOMMO_SECRET_KEY", KOMMO_SECRET_KEY);
  requireEnv("KOMMO_ACCESS_TOKEN", KOMMO_ACCESS_TOKEN);

  const app = createApp({
    config: {
      secretKey: KOMMO_SECRET_KEY,
      accessToken: KOMMO_ACCESS_TOKEN,
      allowedReturnHosts: KOMMO_ALLOWED_RETURN_HOSTS,
      continueTimeoutMs: KOMMO_CONTINUE_TIMEOUT_MS
    },
    services: {
      verifyWidgetToken: verifyWidgetToken,
      buildBotResponse: buildBotResponse,
      continueSalesbot: continueSalesbot
    },
    logger: console
  });

  app.listen(PORT, function () {
    console.log("Kommo chatbot backend listening on port", PORT);
  });
}

start();
