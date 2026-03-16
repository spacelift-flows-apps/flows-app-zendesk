import { AppBlock, events } from "@slflows/sdk/v1";
import {
  createZendeskClient,
  getGroups,
  getAgents,
} from "../../utils/zendeskClient";

export const createTicket: AppBlock = {
  name: "Create Ticket",
  description: "Create a new Zendesk support ticket",
  category: "Tickets",

  inputs: {
    default: {
      config: {
        subject: {
          name: "Subject",
          description: "The subject/title of the ticket",
          type: "string",
          required: true,
        },
        description: {
          name: "Description",
          description: "The initial description/body of the ticket",
          type: "string",
          required: false,
        },
        priority: {
          name: "Priority",
          description: "Ticket priority level",
          type: {
            type: "string",
            enum: ["low", "normal", "high", "urgent"],
          },
          required: false,
        },
        status: {
          name: "Status",
          description: "Initial ticket status",
          type: {
            type: "string",
            enum: ["new", "open", "pending", "hold"],
          },
          required: false,
          default: "new",
        },
        type: {
          name: "Type",
          description: "Ticket type",
          type: {
            type: "string",
            enum: ["problem", "incident", "question", "task"],
          },
          required: false,
        },
        requesterId: {
          name: "Requester ID",
          description:
            "The ID of the user who requested the ticket. If not provided, the authenticated user is used.",
          type: "string",
          required: false,
        },
        assigneeId: {
          name: "Assignee",
          description: "The agent to assign the ticket to",
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
          description: "The group to assign the ticket to",
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
          description: "Tags to add to the ticket",
          type: ["string"],
          required: false,
        },
        externalId: {
          name: "External ID",
          description:
            "An external ID for linking the ticket to an external system",
          type: "string",
          required: false,
        },
        customFields: {
          name: "Custom Fields",
          description:
            'Custom ticket fields as a JSON object mapping field IDs to values (e.g., { "12345": "value" })',
          type: {
            type: "object",
          },
          required: false,
        },
      },
      onEvent: async (input) => {
        const { subdomain, email, apiToken } = input.app.config;
        const {
          subject,
          description,
          priority,
          status,
          type,
          requesterId,
          assigneeId,
          groupId,
          tags,
          externalId,
          customFields,
        } = input.event.inputConfig;

        const client = createZendeskClient({ subdomain, email, apiToken });

        const ticket: any = { subject };

        if (description) {
          ticket.comment = { body: description };
        }
        if (priority) {
          ticket.priority = priority;
        }
        if (status) {
          ticket.status = status;
        }
        if (type) {
          ticket.type = type;
        }
        if (requesterId) {
          ticket.requester_id = Number(requesterId);
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
        if (externalId) {
          ticket.external_id = externalId;
        }
        if (customFields) {
          ticket.custom_fields = Object.entries(
            customFields as Record<string, any>,
          ).map(([id, value]) => ({ id: Number(id), value }));
        }

        const result = await client.post<{
          ticket: { id: number; url: string };
        }>("/tickets.json", { ticket });

        await events.emit({
          ticketId: String(result.ticket.id),
          ticketUrl: `https://${subdomain}.zendesk.com/agent/tickets/${result.ticket.id}`,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Created Ticket",
      description: "Details of the created ticket",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          ticketId: {
            type: "string",
            description: "The ID of the created ticket",
          },
          ticketUrl: {
            type: "string",
            description: "URL to view the ticket in Zendesk",
          },
        },
        required: ["ticketId", "ticketUrl"],
      },
    },
  },
};
