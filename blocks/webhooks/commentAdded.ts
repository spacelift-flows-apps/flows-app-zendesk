import { AppBlock, events } from "@slflows/sdk/v1";

export const commentAdded: AppBlock = {
  name: "Comment Added",
  description: "Triggered when a comment is added to a Zendesk ticket",
  category: "Webhooks",

  inputs: {},

  onInternalMessage: async (input) => {
    const payload = input.message.body;
    const ticketId = payload.subject?.replace("zen:ticket:", "") ?? null;

    await events.emit({
      ticket: {
        id: ticketId,
        ...(payload.detail || {}),
      },
      event: payload.event || {},
      accountId: payload.account_id ?? null,
      timestamp: payload.time || new Date().toISOString(),
    });
  },

  outputs: {
    default: {
      name: "Comment Added Event",
      description: "Data from a comment added event",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          ticket: {
            type: "object",
            description: "Ticket data from the event",
            additionalProperties: true,
            properties: {
              id: { type: "string", description: "Ticket ID" },
            },
          },
          event: {
            type: "object",
            description: "Event-specific data including comment details",
            additionalProperties: true,
          },
          accountId: {
            type: "number",
            description: "Zendesk account ID",
          },
          timestamp: {
            type: "string",
            description: "When the event occurred",
          },
        },
        required: ["ticket", "timestamp"],
      },
    },
  },
};
