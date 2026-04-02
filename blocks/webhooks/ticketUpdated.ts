import { AppBlock, events } from "@slflows/sdk/v1";

export const ticketUpdated: AppBlock = {
  name: "Ticket Updated",
  description:
    "Triggered when a Zendesk ticket is updated (status, priority, assignment, subject, tags, or type changes)",
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
      eventType: payload.type ?? null,
      event: payload.event || {},
      accountId: payload.account_id ?? null,
      timestamp: payload.time || new Date().toISOString(),
    });
  },

  outputs: {
    default: {
      name: "Ticket Updated Event",
      description: "Data from a ticket update event",
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
          eventType: {
            type: "string",
            description:
              "The specific event type (e.g. zen:event-type:ticket.status_changed)",
          },
          event: {
            type: "object",
            description: "Event-specific data including changes",
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
        required: ["ticket", "eventType", "timestamp"],
      },
    },
  },
};
