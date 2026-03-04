define(["jquery"], function ($) {
  return function Widget() {
    var self = this;

    function buildRequestData() {
      var data = {
        message: "{{message_text}}",
        source: "kommo_salesbot_widget",
        entity_type: APP.getBaseEntity()
      };

      if (APP.getBaseEntity() === "lead") {
        data.lead_id = "{{lead.id}}";
      }

      if (APP.getBaseEntity() === "contact") {
        data.contact_id = "{{contact.id}}";
      }

      return data;
    }

    function buildWebhookUrl(params) {
      var settings = self.get_settings() || {};
      var url = params && params.webhook_url ? params.webhook_url : settings.default_webhook_url;
      return url || "";
    }

    this.callbacks = {
      settings: function () {},
      init: function () {
        return true;
      },
      bind_actions: function () {
        return true;
      },
      render: function () {
        return true;
      },
      onSave: function () {
        return true;
      },
      destroy: function () {},
      salesbotDesignerSettings: function () {
        return {
          exits: [
            {
              code: "success",
              title: self.i18n("salesbot.success_exit")
            },
            {
              code: "fail",
              title: self.i18n("salesbot.fail_exit")
            }
          ]
        };
      },
      onSalesbotDesignerSave: function (handlerCode, params) {
        var webhookUrl = buildWebhookUrl(params);
        var requestData = buildRequestData();

        var requestStep = {
          question: [
            {
              handler: "widget_request",
              params: {
                url: webhookUrl,
                data: requestData
              }
            }
          ],
          require: []
        };

        var statusBranchStep = {
          question: [
            {
              handler: "conditions",
              params: {
                logic: "and",
                conditions: [
                  {
                    term1: "{{json.status}}",
                    term2: "success",
                    operation: "="
                  }
                ],
                result: [
                  {
                    handler: "exits",
                    params: {
                      value: "success"
                    }
                  }
                ]
              }
            },
            {
              handler: "exits",
              params: {
                value: "fail"
              }
            }
          ],
          require: []
        };

        return JSON.stringify([requestStep, statusBranchStep]);
      }
    };

    return this;
  };
});

