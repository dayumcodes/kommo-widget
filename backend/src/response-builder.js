function getMessageFromPayload(payload) {
  if (!payload || !payload.data) {
    return "";
  }

  if (typeof payload.data.message === "string") {
    return payload.data.message.trim();
  }

  if (typeof payload.data.message_text === "string") {
    return payload.data.message_text.trim();
  }

  return "";
}

async function buildBotResponse(payload, tokenData) {
  const message = getMessageFromPayload(payload);
  const accountId = tokenData && tokenData.account_id ? String(tokenData.account_id) : "unknown";
  const safeMessage = message || "I received your message.";

  return {
    data: {
      status: "success",
      source: "kommo-private-chatbot",
      account_id: accountId,
      reply: "Echo: " + safeMessage
    },
    execute_handlers: [
      {
        handler: "show",
        params: {
          type: "text",
          value: "Echo: " + safeMessage
        }
      }
    ]
  };
}

module.exports = {
  buildBotResponse
};

