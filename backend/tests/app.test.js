const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../src/app");

function createBaseOptions(overrides) {
  const calls = [];
  const options = Object.assign(
    {
      config: {
        secretKey: "test-secret",
        accessToken: "test-access-token",
        allowedReturnHosts: "techxoetic.kommo.com",
        continueTimeoutMs: 10000
      },
      services: {
        verifyWidgetToken: function (token) {
          if (token !== "valid-token") {
            throw new Error("bad token");
          }
          return { account_id: 35830411 };
        },
        buildBotResponse: async function () {
          return {
            data: { status: "success" },
            execute_handlers: [
              {
                handler: "show",
                params: {
                  type: "text",
                  value: "ok"
                }
              }
            ]
          };
        },
        continueSalesbot: async function (options) {
          calls.push(options);
          return { ok: true };
        }
      },
      logger: {
        info: function () {},
        error: function () {}
      }
    },
    overrides || {}
  );

  return { options: options, calls: calls };
}

function waitForAsyncWork() {
  return new Promise(function (resolve) {
    setTimeout(resolve, 30);
  });
}

test("GET /health returns ok", async function () {
  const setup = createBaseOptions();
  const app = createApp(setup.options);
  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
});

test("POST /kommo/widget-request rejects invalid JWT", async function () {
  const setup = createBaseOptions();
  const app = createApp(setup.options);
  const response = await request(app)
    .post("/kommo/widget-request")
    .send({
      token: "invalid-token",
      return_url: "https://techxoetic.kommo.com/api/v4/bots/1/continue/1",
      data: { message: "hello" }
    });

  assert.equal(response.status, 401);
  await waitForAsyncWork();
  assert.equal(setup.calls.length, 0);
});

test("POST /kommo/widget-request rejects non-allowed return host", async function () {
  const setup = createBaseOptions();
  const app = createApp(setup.options);
  const response = await request(app)
    .post("/kommo/widget-request")
    .send({
      token: "valid-token",
      return_url: "https://attacker.example/api/v4/bots/1/continue/1",
      data: { message: "hello" }
    });

  assert.equal(response.status, 400);
  await waitForAsyncWork();
  assert.equal(setup.calls.length, 0);
});

test("POST /kommo/widget-request accepts and sends continuation", async function () {
  const setup = createBaseOptions();
  const app = createApp(setup.options);
  const response = await request(app)
    .post("/kommo/widget-request")
    .send({
      token: "valid-token",
      return_url: "https://techxoetic.kommo.com/api/v4/bots/1/continue/1",
      data: {
        message: "hello",
        lead_id: "123"
      }
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.accepted, true);
  assert.equal(typeof response.body.request_id, "string");

  await waitForAsyncWork();
  assert.equal(setup.calls.length, 1);
  assert.equal(setup.calls[0].returnUrl, "https://techxoetic.kommo.com/api/v4/bots/1/continue/1");
  assert.equal(setup.calls[0].accessToken, "test-access-token");
  assert.equal(setup.calls[0].body.data.status, "success");
});

test("POST /kommo/widget-request sends failover payload if primary continuation fails", async function () {
  const calls = [];
  const setup = createBaseOptions({
    services: {
      verifyWidgetToken: function () {
        return { account_id: 35830411 };
      },
      buildBotResponse: async function () {
        return {
          data: { status: "success" },
          execute_handlers: [
            {
              handler: "show",
              params: {
                type: "text",
                value: "ok"
              }
            }
          ]
        };
      },
      continueSalesbot: async function (options) {
        calls.push(options);
        if (calls.length === 1) {
          throw new Error("primary failed");
        }
        return { ok: true };
      }
    },
    logger: {
      info: function () {},
      error: function () {}
    }
  });

  const app = createApp(setup.options);
  const response = await request(app)
    .post("/kommo/widget-request")
    .send({
      token: "valid-token",
      return_url: "https://techxoetic.kommo.com/api/v4/bots/1/continue/1",
      data: { message: "hello" }
    });

  assert.equal(response.status, 200);
  await waitForAsyncWork();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].body.data.status, "fail");
  assert.equal(calls[1].body.data.error, "internal_error");
});

