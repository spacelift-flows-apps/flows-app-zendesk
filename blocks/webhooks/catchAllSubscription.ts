import { AppBlock, events } from "@slflows/sdk/v1";

export const catchAllSubscription: AppBlock = {
  name: "All Webhook Events",
  description:
    "Receives all Zendesk webhook events. Use this as an escape hatch to handle event types not covered by other subscription blocks.",
  category: "Webhooks",

  inputs: {},

  onInternalMessage: async (input) => {
    await events.emit(input.message.body);
  },

  outputs: {
    default: {
      name: "Webhook Event",
      description: "Raw Zendesk webhook event payload",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        additionalProperties: true,
      },
    },
  },
};
