import { AppBlock, events } from "@slflows/sdk/v1";
import { createZendeskClient } from "../../utils/zendeskClient";

export const transitionTicket: AppBlock = {
  name: "Transition Ticket",
  description: "Change the status of a Zendesk ticket",
  category: "Tickets",

  inputs: {
    default: {
      config: {
        ticketId: {
          name: "Ticket ID",
          description: "The ID of the ticket to transition",
          type: "string",
          required: true,
        },
        status: {
          name: "Status",
          description: "The new status for the ticket",
          type: {
            type: "string",
            enum: ["new", "open", "pending", "hold", "solved", "closed"],
          },
          required: true,
        },
        comment: {
          name: "Comment",
          description:
            "Optional comment to add to the ticket during the status transition",
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const { subdomain, email, apiToken } = input.app.config;
        const { ticketId, status, comment } = input.event.inputConfig;

        const client = createZendeskClient({ subdomain, email, apiToken });

        const ticket: any = { status };

        if (comment) {
          ticket.comment = { body: comment, public: false };
        }

        await client.put(`/tickets/${ticketId}.json`, { ticket });

        await events.emit({
          ticketId: String(ticketId),
          ticketUrl: `https://${subdomain}.zendesk.com/agent/tickets/${ticketId}`,
          status: String(status),
          transitioned: true,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Transition Result",
      description: "Confirmation of the status transition",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          ticketId: {
            type: "string",
            description: "The ID of the transitioned ticket",
          },
          ticketUrl: {
            type: "string",
            description: "URL to view the ticket in Zendesk",
          },
          status: {
            type: "string",
            description: "The new status of the ticket",
          },
          transitioned: {
            type: "boolean",
            description: "Whether the transition was successful",
          },
        },
        required: ["ticketId", "ticketUrl", "status", "transitioned"],
      },
    },
  },
};
