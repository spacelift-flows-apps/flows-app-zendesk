import { AppBlock, events } from "@slflows/sdk/v1";
import { createZendeskClient } from "../../utils/zendeskClient";
import { assigneeConfig, groupConfig } from "../../utils/suggestValues";

export const assignTicket: AppBlock = {
  name: "Assign Ticket",
  description: "Assign or reassign a Zendesk ticket to an agent and/or group",
  category: "Tickets",

  inputs: {
    default: {
      config: {
        ticketId: {
          name: "Ticket ID",
          description: "The ID of the ticket to assign",
          type: "string",
          required: true,
        },
        assigneeId: assigneeConfig,
        groupId: groupConfig,
      },
      onEvent: async (input) => {
        const { subdomain, email, apiToken } = input.app.config;
        const { ticketId, assigneeId, groupId } = input.event.inputConfig;

        const client = createZendeskClient({ subdomain, email, apiToken });

        const ticket: any = {};
        if (assigneeId !== undefined) {
          ticket.assignee_id = assigneeId ? Number(assigneeId) : null;
        }
        if (groupId !== undefined) {
          ticket.group_id = groupId ? Number(groupId) : null;
        }

        await client.put(`/tickets/${ticketId}.json`, { ticket });

        await events.emit({
          ticketId: String(ticketId),
          assigneeId: assigneeId ? String(assigneeId) : null,
          groupId: groupId ? String(groupId) : null,
          ticketUrl: `https://${subdomain}.zendesk.com/agent/tickets/${ticketId}`,
          assigned: true,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Assignment Result",
      description: "Confirmation of the ticket assignment",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          ticketId: {
            type: "string",
            description: "The ID of the assigned ticket",
          },
          assigneeId: {
            type: "string",
            description:
              "The ID of the agent the ticket was assigned to, or null if unassigned",
          },
          groupId: {
            type: "string",
            description:
              "The ID of the group the ticket was assigned to, or null if unassigned",
          },
          ticketUrl: {
            type: "string",
            description: "URL to view the ticket in Zendesk",
          },
          assigned: {
            type: "boolean",
            description: "Whether the assignment was successful",
          },
        },
        required: ["ticketId", "ticketUrl", "assigned"],
      },
    },
  },
};
