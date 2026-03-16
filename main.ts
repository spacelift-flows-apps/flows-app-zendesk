import {
  defineApp,
  http,
  messaging,
  blocks as blocksApi,
  kv,
} from "@slflows/sdk/v1";
import { blocks } from "./blocks/index";
import { createZendeskClient } from "./utils/zendeskClient";

export const app = defineApp({
  name: "Zendesk Integration",
  installationInstructions:
    "Zendesk integration for managing tickets and receiving ticket events.\n\nTo install:\n1. Enter your Zendesk subdomain (e.g., 'mycompany' for mycompany.zendesk.com)\n2. Enter your Zendesk account email address\n3. Generate an API token at Zendesk Admin > Apps and Integrations > APIs > Zendesk API, and paste it below\n4. Webhook setup is automatic — a webhook will be created in your Zendesk account to receive ticket events",

  blocks,

  config: {
    subdomain: {
      name: "Subdomain",
      description:
        "Your Zendesk subdomain (e.g., 'mycompany' for mycompany.zendesk.com)",
      type: "string",
      required: true,
    },
    email: {
      name: "Email",
      description: "Your Zendesk account email address",
      type: "string",
      required: true,
    },
    apiToken: {
      name: "API Token",
      description:
        "Your Zendesk API token (generate from Admin > Apps and Integrations > APIs > Zendesk API)",
      type: "string",
      required: true,
      sensitive: true,
    },
  },

  signals: {
    userId: {
      name: "User ID",
      description: "The ID of the authenticated Zendesk user",
    },
    userName: {
      name: "User Name",
      description: "Display name of the authenticated Zendesk user",
    },
    userEmail: {
      name: "User Email",
      description: "Email address of the authenticated Zendesk user",
    },
  },

  async onSync(input) {
    const { subdomain, email, apiToken } = input.app.config;

    try {
      const client = createZendeskClient({ subdomain, email, apiToken });

      // Validate credentials
      const userInfo = await client.get<{
        user: { id: number; name: string; email: string };
      }>("/users/me.json");

      // Check if webhook already exists
      const existingWebhookId = await kv.app.get("webhook_id");

      if (existingWebhookId?.value) {
        // Ensure signing secret is still available — re-fetch if missing
        const existingSecret = await kv.app.get("signing_secret");
        if (!existingSecret?.value) {
          const signingSecretResponse = await client.get<{
            signing_secret: { secret: string };
          }>(`/webhooks/${existingWebhookId.value}/signing_secret`);

          await kv.app.set({
            key: "signing_secret",
            value: signingSecretResponse.signing_secret.secret,
          });
        }

        return {
          newStatus: "ready" as const,
          signalUpdates: {
            userId: String(userInfo.user.id),
            userName: userInfo.user.name,
            userEmail: userInfo.user.email,
          },
        };
      }

      // Create webhook with event subscriptions
      const webhookResponse = await client.post<{
        webhook: { id: string };
      }>("/webhooks", {
        webhook: {
          name: "Spacelift Flows Integration",
          status: "active",
          endpoint: `${input.app.http.url}/webhook`,
          http_method: "POST",
          request_format: "json",
          subscriptions: [
            "zen:event-type:ticket.created",
            "zen:event-type:ticket.comment_added",
            "zen:event-type:ticket.status_changed",
            "zen:event-type:ticket.priority_changed",
            "zen:event-type:ticket.agent_assignment_changed",
            "zen:event-type:ticket.group_assignment_changed",
            "zen:event-type:ticket.subject_changed",
            "zen:event-type:ticket.tags_changed",
            "zen:event-type:ticket.type_changed",
          ],
        },
      });

      const webhookId = webhookResponse.webhook.id;

      // Retrieve the auto-generated signing secret
      const signingSecretResponse = await client.get<{
        signing_secret: { secret: string };
      }>(`/webhooks/${webhookId}/signing_secret`);

      // Store webhook ID and signing secret
      await kv.app.set({ key: "webhook_id", value: webhookId });
      await kv.app.set({
        key: "signing_secret",
        value: signingSecretResponse.signing_secret.secret,
      });

      return {
        newStatus: "ready" as const,
        signalUpdates: {
          userId: String(userInfo.user.id),
          userName: userInfo.user.name,
          userEmail: userInfo.user.email,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error during Zendesk sync:", errorMessage);

      return {
        newStatus: "failed" as const,
        customStatusDescription:
          "Authentication or webhook setup failed, see logs",
      };
    }
  },

  async onDrain(input) {
    const { subdomain, email, apiToken } = input.app.config;

    try {
      const webhookIdPair = await kv.app.get("webhook_id");
      const webhookId = webhookIdPair?.value;

      if (!webhookId) {
        return { newStatus: "drained" as const };
      }

      try {
        const client = createZendeskClient({ subdomain, email, apiToken });
        await client.delete(`/webhooks/${webhookId}`);
      } catch (deleteError) {
        // Treat 404 as success since webhook doesn't exist
        const errorMsg =
          deleteError instanceof Error
            ? deleteError.message
            : String(deleteError);
        if (!errorMsg.includes("404")) {
          throw deleteError;
        }
      }

      // Clean up KV
      await kv.app.delete(["webhook_id", "signing_secret"]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Error during webhook cleanup:", errorMsg);
      return {
        newStatus: "draining_failed" as const,
        customStatusDescription: errorMsg,
      };
    }

    return { newStatus: "drained" as const };
  },

  http: {
    async onRequest(input) {
      try {
        // Verify Zendesk webhook signature
        const signature = input.request.headers["X-Zendesk-Webhook-Signature"];
        const timestamp =
          input.request.headers["X-Zendesk-Webhook-Signature-Timestamp"];

        const signingSecretPair = await kv.app.get("signing_secret");
        const signingSecret = signingSecretPair?.value;

        if (!signature || !timestamp || !signingSecret) {
          console.warn("Webhook request rejected: Missing signature or secret");
          await http.respond(input.request.requestId, {
            statusCode: 401,
            body: "Unauthorized",
          });
          return;
        }

        // Compute expected signature: base64(HMAC-SHA256(timestamp + rawBody, secret))
        const crypto = await import("crypto");
        const signBody = timestamp + input.request.rawBody;
        const expectedSignature = crypto
          .createHmac("sha256", signingSecret as string)
          .update(signBody, "utf8")
          .digest("base64");

        // Constant-time comparison
        if (
          !crypto.timingSafeEqual(
            Buffer.from(expectedSignature, "utf8"),
            Buffer.from(signature as string, "utf8"),
          )
        ) {
          console.warn("Webhook request rejected: Invalid signature");
          await http.respond(input.request.requestId, {
            statusCode: 401,
            body: "Unauthorized",
          });
          return;
        }

        // Parse the event payload
        const payload = JSON.parse(input.request.rawBody);
        const eventType = payload.type as string | undefined;

        // Route event to appropriate block type(s)
        const typeIds: string[] = [];

        if (eventType === "zen:event-type:ticket.created") {
          typeIds.push("ticketCreated");
        } else if (eventType === "zen:event-type:ticket.comment_added") {
          typeIds.push("commentAdded");
        } else if (
          eventType === "zen:event-type:ticket.status_changed" ||
          eventType === "zen:event-type:ticket.priority_changed" ||
          eventType === "zen:event-type:ticket.agent_assignment_changed" ||
          eventType === "zen:event-type:ticket.group_assignment_changed" ||
          eventType === "zen:event-type:ticket.subject_changed" ||
          eventType === "zen:event-type:ticket.tags_changed" ||
          eventType === "zen:event-type:ticket.type_changed"
        ) {
          typeIds.push("ticketUpdated");
        }

        // Always include catch-all subscription
        typeIds.push("catchAllSubscription");

        const listOutput = await blocksApi.list({ typeIds });
        const blockIds = listOutput.blocks.map((block) => block.id);

        if (blockIds.length > 0) {
          await messaging.sendToBlocks({
            blockIds,
            body: payload,
          });
        }

        await http.respond(input.request.requestId, {
          statusCode: 200,
          body: "OK",
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Error processing webhook:", errorMessage);

        await http.respond(input.request.requestId, {
          statusCode: 400,
          body: "Bad Request",
        });
      }
    },
  },
});
