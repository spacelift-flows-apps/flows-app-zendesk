import { AppBlock, events } from "@slflows/sdk/v1";
import { createZendeskClient } from "../../utils/zendeskClient";

export const addComment: AppBlock = {
  name: "Add Comment",
  description: "Add a comment to an existing Zendesk ticket",
  category: "Tickets",

  inputs: {
    default: {
      config: {
        ticketId: {
          name: "Ticket ID",
          description: "The ID of the ticket to comment on",
          type: "string",
          required: true,
        },
        body: {
          name: "Comment Body",
          description: "The text content of the comment",
          type: "string",
          required: true,
        },
        public: {
          name: "Public",
          description: "Whether the comment is visible to the requester",
          type: "boolean",
          required: false,
          default: true,
        },
        authorId: {
          name: "Author ID",
          description:
            "The ID of the user to post the comment as. If not provided, the authenticated user is used.",
          type: "string",
          required: false,
        },
      },
      onEvent: async (input) => {
        const { subdomain, email, apiToken } = input.app.config;
        const { ticketId, body, authorId } = input.event.inputConfig;
        const isPublic = input.event.inputConfig.public;

        const client = createZendeskClient({ subdomain, email, apiToken });

        const comment: any = {
          body,
          public: isPublic,
        };

        if (authorId) {
          comment.author_id = Number(authorId);
        }

        const result = await client.put<{
          audit: {
            events: Array<{ id: number; type: string; body?: string }>;
          };
        }>(`/tickets/${ticketId}.json`, {
          ticket: { comment },
        });

        // Extract the comment event from the audit to get the comment ID
        const commentEvent = result?.audit?.events?.find(
          (e) => e.type === "Comment",
        );

        await events.emit({
          ticketId: String(ticketId),
          commentId: commentEvent ? String(commentEvent.id) : null,
          ticketUrl: `https://${subdomain}.zendesk.com/agent/tickets/${ticketId}`,
          commented: true,
        });
      },
    },
  },

  outputs: {
    default: {
      name: "Comment Result",
      description: "Confirmation of the comment addition",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        properties: {
          ticketId: {
            type: "string",
            description: "The ID of the commented ticket",
          },
          commentId: {
            type: "string",
            description: "The ID of the created comment",
          },
          ticketUrl: {
            type: "string",
            description: "URL to view the ticket in Zendesk",
          },
          commented: {
            type: "boolean",
            description: "Whether the comment was added successfully",
          },
        },
        required: ["ticketId", "commented"],
      },
    },
  },
};
