import { AppBlock, events } from "@slflows/sdk/v1";
import { createZendeskClient } from "../../utils/zendeskClient";

export const getTicket: AppBlock = {
  name: "Get Ticket",
  description: "Retrieve a Zendesk ticket by ID",
  category: "Tickets",

  inputs: {
    default: {
      config: {
        ticketId: {
          name: "Ticket ID",
          description: "The ID of the ticket to retrieve",
          type: "string",
          required: true,
        },
      },
      onEvent: async (input) => {
        const { subdomain, email, apiToken } = input.app.config;
        const { ticketId } = input.event.inputConfig;

        const client = createZendeskClient({ subdomain, email, apiToken });

        const result = await client.get<{ ticket: any }>(
          `/tickets/${ticketId}.json`,
        );

        const ticket = result.ticket;

        await events.emit({
          id: String(ticket.id),
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          type: ticket.type,
          assigneeId: ticket.assignee_id ? String(ticket.assignee_id) : null,
          groupId: ticket.group_id ? String(ticket.group_id) : null,
          requesterId: ticket.requester_id ? String(ticket.requester_id) : null,
          tags: ticket.tags || [],
          createdAt: ticket.created_at,
          updatedAt: ticket.updated_at,
          url: `https://${subdomain}.zendesk.com/agent/tickets/${ticket.id}`,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Ticket",
      description: "The retrieved ticket data",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Ticket ID"
          },
          subject: {
            type: "string",
            description: "Ticket subject"
          },
          description: { 
            type: "string",
            description: "Ticket description" },
          status: {
            type: "string",
            description: "Ticket status" 
          },
          priority: {
            type: "string",
            description: "Ticket priority"
          },
          type: {
            type: "string",
            description: "Ticket type"
          },
          assigneeId: {
            type: "string",
            description: "Assigned agent ID",
          },
          groupId: {
            type: "string",
            description: "Assigned group ID",
          },
          requesterId: {
            type: "string",
            description: "Requester user ID",
          },
          tags: {
            type: "array",
            description: "Ticket tags",
            items: { type: "string" },
          },
          createdAt: {
            type: "string",
            description: "When the ticket was created",
          },
          updatedAt: {
            type: "string",
            description: "When the ticket was last updated",
          },
          url: {
            type: "string",
            description: "URL to view the ticket in Zendesk",
          },
        },
        required: ["id", "subject", "status"],
      },
    },
  },
};
