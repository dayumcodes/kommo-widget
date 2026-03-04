const { randomUUID } = require("crypto");
const express = require("express");

function parseAllowedHosts(value) {
  return String(value || "")
    .split(",")
    .map(function (host) {
      return host.trim().toLowerCase();
    })
    .filter(Boolean);
}

function isReturnUrlAllowed(returnUrl, allowedHosts) {
  try {
    const parsed = new URL(returnUrl);
    if (parsed.protocol !== "https:") {
      return false;
    }

    if (!allowedHosts.length) {
      return true;
    }

    return allowedHosts.indexOf(parsed.hostname.toLowerCase()) !== -1;
  } catch (error) {
    return false;
  }
}

function normalizeBotResult(result) {
  const fallbackText = "I could not process your request.";
  const data = Object.assign(
    {
      status: "success"
    },
    result && result.data ? result.data : {}
  );

  const handlers = Array.isArray(result && result.execute_handlers) && result.execute_handlers.length
    ? result.execute_handlers
    : [
        {
          handler: "show",
          params: {
            type: "text",
            value: fallbackText
          }
        }
      ];

  return {
    data: data,
    execute_handlers: handlers
  };
}

function getFailurePayload() {
  return {
    data: {
      status: "fail",
      error: "internal_error"
    },
    execute_handlers: [
      {
        handler: "show",
        params: {
          type: "text",
          value: "Sorry, I could not process your request."
        }
      }
    ]
  };
}

function getRequestContext(requestBody, tokenData) {
  const data = requestBody && requestBody.data ? requestBody.data : {};

  return {
    request_id: randomUUID(),
    account_id: tokenData && tokenData.account_id ? String(tokenData.account_id) : "unknown",
    lead_id: data.lead_id || null,
    contact_id: data.contact_id || null
  };
}

function createApp(options) {
  const config = options.config;
  const services = options.services;
  const logger = options.logger || console;
  const allowedHosts = parseAllowedHosts(config.allowedReturnHosts);

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", function (req, res) {
    res.status(200).json({ ok: true });
  });

  app.post("/kommo/widget-request", function (req, res) {
    const requestBody = req.body || {};
    const token = requestBody.token;
    const returnUrl = requestBody.return_url;

    if (!token || !returnUrl) {
      res.status(400).json({ error: "token and return_url are required" });
      return;
    }

    if (!isReturnUrlAllowed(returnUrl, allowedHosts)) {
      res.status(400).json({ error: "return_url is invalid or not allowed" });
      return;
    }

    let tokenData;
    try {
      tokenData = services.verifyWidgetToken(token, config.secretKey);
    } catch (error) {
      res.status(401).json({ error: "invalid token" });
      return;
    }

    const context = getRequestContext(requestBody, tokenData);
    res.status(200).json({
      accepted: true,
      request_id: context.request_id
    });

    setImmediate(async function () {
      try {
        logger.info("kommo.request.accepted", context);

        const botResult = await services.buildBotResponse(requestBody, tokenData);
        const continuePayload = normalizeBotResult(botResult);

        await services.continueSalesbot({
          returnUrl: requestBody.return_url,
          accessToken: config.accessToken,
          body: continuePayload,
          timeoutMs: config.continueTimeoutMs
        });

        logger.info("kommo.continuation.sent", context);
      } catch (error) {
        logger.error("kommo.continuation.primary_failed", Object.assign({ error: error.message }, context));
        try {
          await services.continueSalesbot({
            returnUrl: requestBody.return_url,
            accessToken: config.accessToken,
            body: getFailurePayload(),
            timeoutMs: config.continueTimeoutMs
          });
          logger.info("kommo.continuation.failover_sent", context);
        } catch (continueError) {
          logger.error(
            "kommo.continuation.failover_failed",
            Object.assign({ error: continueError.message }, context)
          );
        }
      }
    });
  });

  return app;
}

module.exports = {
  createApp,
  getFailurePayload,
  isReturnUrlAllowed,
  normalizeBotResult,
  parseAllowedHosts
};

