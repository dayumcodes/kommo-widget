const axios = require("axios");
const jwt = require("jsonwebtoken");

function verifyWidgetToken(token, secretKey) {
  return jwt.verify(token, secretKey, { algorithms: ["HS256"] });
}

async function continueSalesbot(options) {
  const response = await axios.post(options.returnUrl, options.body, {
    headers: {
      Authorization: "Bearer " + options.accessToken,
      "Content-Type": "application/json"
    },
    timeout: options.timeoutMs,
    validateStatus: function (status) {
      return status >= 200 && status < 300;
    }
  });

  return response.data;
}

module.exports = {
  continueSalesbot,
  verifyWidgetToken
};

