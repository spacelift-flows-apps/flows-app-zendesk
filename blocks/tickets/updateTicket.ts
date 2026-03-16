import { AppBlock, events } from "@slflows/sdk/v1";
import {
  createZendeskClient,
  getGroups,
  getAgents,
} from "../../utils/zendeskClient";

export const updateTicket: AppBlock = {
  name: "Update Ticket",
  description: "Update fields on an existing Zendesk ticket",
  category: "Tickets",

  inputs: {
    default: {
      config: {
        ticketId: {
          name: "Ticket ID",
          description: "The ID of the ticket to update",
          type: "string",
          required: true,
        },
        subject: {
          name: "Subject",
          description: "New subject for the ticket",
          type: "string",
          required: false,
        },
        status: {
          name: "Status",
          description: "New ticket status",
          type: {
            type: "string",
            enum: ["new", "open", "pending", "hold", "solved", "closed"],
          },
          required: false,
        },
        priority: {
          name: "Priority",
          description: "New priority level",
          type: {
            type: "string",
            enum: ["low", "normal", "high", "urgent"],
          },
          required: false,
        },
        type: {
          name: "Type",
          description: "New ticket type",
          type: {
            type: "string",
            enum: ["problem", "incident", "question", "task"],
          },
          required: false,
        },
        assigneeId: {
          name: "Assignee",
          description:
            "The agent to assign the ticket to (leave empty to keep current)",
          type: "string",
          required: false,
          suggestValues: async (input) => {
            const { subdomain, email, apiToken } = input.app.config;
            const agents = await getAgents(
              subdomain as string,
              email as string,
              apiToken as string,
            );

            let values = agents.map((agent) => ({
              label: `${agent.name} (${agent.email})`,
              value: String(agent.id),
            }));

            if (input.searchPhrase) {
              const searchLower = input.searchPhrase.toLowerCase();
              values = values.filter((v) =>
                v.label.toLowerCase().includes(searchLower),
              );
            }

            return { suggestedValues: values.slice(0, 50) };
          },
        },
        groupId: {
          name: "Group",
          description:
            "The group to assign the ticket to (leave empty to keep current)",
          type: "string",
          required: false,
          suggestValues: async (input) => {
            const { subdomain, email, apiToken } = input.app.config;
            const groups = await getGroups(
              subdomain as string,
              email as string,
              apiToken as string,
            );

            let values = groups.map((group) => ({
              label: group.name,
              value: String(group.id),
            }));

            if (input.searchPhrase) {
              const searchLower = input.searchPhrase.toLowerCase();
              values = values.filter((v) =>
                v.label.toLowerCase().includes(searchLower),
              );
            }

            return { suggestedValues: values.slice(0, 50) };
          },
        },
        tags: {
          name: "Tags",
          description: "Tags to set on the ticket (replaces existing tags)",
          type: ["string"],
          required: false,
        },
        customFields: {
          name: "Custom Fields",
          description:
            "Custom ticket fields as a JSON object mapping field IDs to values (e.g., { \"12345\": \"value\" })",
          type: {
            type: "object",
          },
          required: false,
        },
        additionalFields: {
          name: "Additional Fields",
          description:
            "Additional ticket fields as a JSON object merged directly into the ticket update payload",
          type: {
            type: "object",
          },
          required: false,
        },
      },
      onEvent: async (input) => {
        const { subdomain, email, apiToken } = input.app.config;
        const {
          ticketId,
          subject,
          status,
          priority,
          type,
          assigneeId,
          groupId,
          tags,
          customFields,
          additionalFields,
        } = input.event.inputConfig;

        const client = createZendeskClient({ subdomain, email, apiToken });

        const ticket: any = {};

        if (subject) {
          ticket.subject = subject;
        }
        if (status) {
          ticket.status = status;
        }
        if (priority) {
          ticket.priority = priority;
        }
        if (type) {
          ticket.type = type;
        }
        if (assigneeId) {
          ticket.assignee_id = Number(assigneeId);
        }
        if (groupId) {
          ticket.group_id = Number(groupId);
        }
        if (tags) {
          ticket.tags = tags;
        }
        if (customFields) {
          ticket.custom_fields = Object.entries(
            customFields as Record<string, any>,
          ).map(([id, value]) => ({ id: Number(id), value }));
        }
        if (additionalFields) {
          Object.assign(ticket, additionalFields);
        }

        await client.put(`/tickets/${ticketId}.json`, { ticket });

        await events.emit({
          ticketId: String(ticketId),
          ticketUrl: `https://${subdomain}.zendesk.com/agent/tickets/${ticketId}`,
          updated: true,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Updated Ticket",
      description: "Confirmation of the ticket update",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          ticketId: {
            type: "string",
            description: "The ID of the updated ticket",
          },
          ticketUrl: {
            type: "string",
            description: "URL to view the ticket in Zendesk",
          },
          updated: {
            type: "boolean",
            description: "Whether the update was successful",
          },
        },
        required: ["ticketId", "ticketUrl", "updated"],
      },
    },
  },
};
