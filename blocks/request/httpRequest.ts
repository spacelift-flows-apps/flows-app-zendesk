import { AppBlock, events } from "@slflows/sdk/v1";
import { createZendeskClient } from "../../utils/zendeskClient";

export const httpRequest: AppBlock = {
  name: "HTTP Request",
  description:
    "Make a direct authenticated request to any Zendesk API endpoint",
  category: "Request",

  inputs: {
    default: {
      config: {
        method: {
          name: "HTTP Method",
          description: "HTTP method for the request",
          type: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE"],
          },
          required: true,
        },
        path: {
          name: "Path",
          description:
            'API path after /api/v2 (e.g., "/tickets.json", "/users/me.json")',
          type: "string",
          required: true,
        },
        queryParams: {
          name: "Query Parameters",
          description:
            "URL query parameters as a JSON object (e.g., { \"per_page\": \"50\", \"page\": \"2\" })",
          type: {
            type: "object",
          },
          required: false,
        },
        body: {
          name: "Body",
          description: "Request body as a JSON object (for POST and PUT requests)",
          type: {
            type: "object",
            additionalProperties: true,
          },
          required: false,
        },
        headers: {
          name: "Headers",
          description:
            "Additional HTTP headers as a JSON object (Authorization is set automatically)",
          type: {
            type: "object",
          },
          required: false,
        },
      },
      onEvent: async (input) => {
        const { subdomain, email, apiToken } = input.app.config;
        const { method, path, queryParams, body, headers } =
          input.event.inputConfig;

        const client = createZendeskClient({ subdomain, email, apiToken });

        // Build the full path with query parameters
        let fullPath = path as string;
        if (queryParams) {
          const params = new URLSearchParams(
            queryParams as Record<string, string>,
          );
          const separator = fullPath.includes("?") ? "&" : "?";
          fullPath = `${fullPath}${separator}${params.toString()}`;
        }

        const requestHeaders = headers as Record<string, string> | undefined;
        let result: any;

        switch (method) {
          case "GET":
            result = await client.get(fullPath, { headers: requestHeaders });
            break;
          case "POST":
            result = await client.post(fullPath, body, {
              headers: requestHeaders,
            });
            break;
          case "PUT":
            result = await client.put(fullPath, body, {
              headers: requestHeaders,
            });
            break;
          case "DELETE":
            result = await client.delete(fullPath, {
              headers: requestHeaders,
            });
            break;
          default:
            throw new Error(`Unsupported HTTP method: ${method}`);
        }

        await events.emit(result ?? {});
      },
    },
  },

  outputs: {
    default: {
      name: "Response",
      description: "The API response",
      default: true,
      possiblePrimaryParents: ["default"],
      type: {
        type: "object",
        additionalProperties: true,
      },
    },
  },
};
