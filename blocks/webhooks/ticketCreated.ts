import { AppBlock, events } from "@slflows/sdk/v1";

export const ticketCreated: AppBlock = {
  name: "Ticket Created",
  description: "Triggered when a new Zendesk ticket is created",
  category: "Webhooks",
  entrypoint: true,

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
      name: "Ticket Created Event",
      description: "Data from a ticket creation event",
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
            description: "Event-specific data",
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
