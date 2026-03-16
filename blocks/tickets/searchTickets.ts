import { AppBlock, events } from "@slflows/sdk/v1";
import { createZendeskClient } from "../../utils/zendeskClient";

export const searchTickets: AppBlock = {
  name: "Search Tickets",
  description: "Search for Zendesk tickets using a query string",
  category: "Tickets",

  inputs: {
    default: {
      config: {
        query: {
          name: "Query",
          description:
            'Zendesk search query (e.g., "status:open priority:high")',
          type: "string",
          required: true,
        },
        sortBy: {
          name: "Sort By",
          description: "Field to sort results by",
          type: {
            type: "string",
            enum: [
              "created_at",
              "updated_at",
              "priority",
              "status",
              "ticket_type",
            ],
          },
          required: false,
          default: "created_at",
        },
        sortOrder: {
          name: "Sort Order",
          description: "Sort direction",
          type: {
            type: "string",
            enum: ["asc", "desc"],
          },
          required: false,
          default: "desc",
        },
        perPage: {
          name: "Results Per Page",
          description: "Number of results per page (max 100)",
          type: "number",
          required: false,
          default: 100,
        },
        page: {
          name: "Page",
          description: "Page number to retrieve",
          type: "number",
          required: false,
          default: 1,
        },
      },
      onEvent: async (input) => {
        const { subdomain, email, apiToken } = input.app.config;
        const { query, sortBy, sortOrder, perPage, page } =
          input.event.inputConfig;

        const client = createZendeskClient({ subdomain, email, apiToken });

        const params = new URLSearchParams({
          query: `type:ticket ${query}`,
        });
        if (sortBy) {
          params.set("sort_by", sortBy as string);
        }
        if (sortOrder) {
          params.set("sort_order", sortOrder as string);
        }
        if (perPage) {
          params.set("per_page", String(perPage));
        }
        if (page) {
          params.set("page", String(page));
        }

        const result = await client.get<{
          count: number;
          results: any[];
          next_page: string | null;
          previous_page: string | null;
        }>(`/search.json?${params.toString()}`);

        await events.emit({
          count: result.count,
          nextPage: result.next_page,
          previousPage: result.previous_page,
          hasMore: result.next_page !== null,
          results: result.results.map((ticket: any) => ({
            id: String(ticket.id),
            subject: ticket.subject,
            status: ticket.status,
            priority: ticket.priority,
            type: ticket.type,
            assigneeId: ticket.assignee_id ? String(ticket.assignee_id) : null,
            groupId: ticket.group_id ? String(ticket.group_id) : null,
            tags: ticket.tags || [],
            createdAt: ticket.created_at,
            updatedAt: ticket.updated_at,
            url: `https://${subdomain}.zendesk.com/agent/tickets/${ticket.id}`,
          })),
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Search Results",
      description: "Tickets matching the search query",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          count: {
            type: "number",
            description: "Total number of matching tickets",
          },
          nextPage: {
            type: "string",
            description: "URL to the next page of results, or null",
          },
          previousPage: {
            type: "string",
            description: "URL to the previous page of results, or null",
          },
          hasMore: {
            type: "boolean",
            description: "Whether there are more results on the next page",
          },
          results: {
            type: "array",
            description: "List of matching tickets",
            items: {
              type: "object",
              properties: {
                id: { type: "string", description: "Ticket ID" },
                subject: { type: "string", description: "Ticket subject" },
                status: { type: "string", description: "Ticket status" },
                priority: { type: "string", description: "Ticket priority" },
                type: { type: "string", description: "Ticket type" },
                assigneeId: {
                  type: "string",
                  description: "Assigned agent ID",
                },
                groupId: {
                  type: "string",
                  description: "Assigned group ID",
                },
                tags: {
                  type: "array",
                  description: "Ticket tags",
                  items: { type: "string" },
                },
                createdAt: {
                  type: "string",
                  description: "Creation timestamp",
                },
                updatedAt: {
                  type: "string",
                  description: "Last update timestamp",
                },
                url: {
                  type: "string",
                  description: "URL to view the ticket",
                },
              },
              required: ["id", "subject", "status"],
            },
          },
        },
        required: ["count", "hasMore", "results"],
      },
    },
  },
};
