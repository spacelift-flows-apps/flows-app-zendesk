import memoizee from "memoizee";

export interface ZendeskConfig {
  subdomain: string;
  email: string;
  apiToken: string;
}

export class ZendeskClient {
  private baseUrl: string;
  private auth: string;

  constructor(config: ZendeskConfig) {
    this.baseUrl = `https://${config.subdomain}.zendesk.com/api/v2`;
    this.auth = Buffer.from(
      `${config.email}/token:${config.apiToken}`,
    ).toString("base64");
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Basic ${this.auth}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zendesk API error (${response.status}): ${errorText}`);
    }

    // Handle empty responses (e.g., 204 No Content)
    const contentLength = response.headers.get("content-length");
    if (contentLength === "0" || response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }

  async get<T>(
    endpoint: string,
    options?: { headers?: Record<string, string> },
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: "GET",
      headers: options?.headers,
    });
  }

  async post<T>(
    endpoint: string,
    data?: any,
    options?: { headers?: Record<string, string> },
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      headers: options?.headers,
    });
  }

  async put<T>(
    endpoint: string,
    data?: any,
    options?: { headers?: Record<string, string> },
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      headers: options?.headers,
    });
  }

  async delete<T>(
    endpoint: string,
    options?: { headers?: Record<string, string> },
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: "DELETE",
      headers: options?.headers,
    });
  }
}

export function createZendeskClient(config: ZendeskConfig): ZendeskClient {
  return new ZendeskClient(config);
}

// Memoized fetchers for suggestValues

interface ZendeskGroup {
  id: number;
  name: string;
}

interface ZendeskUser {
  id: number;
  name: string;
  email: string;
}

async function fetchGroups(
  subdomain: string,
  email: string,
  apiToken: string,
): Promise<ZendeskGroup[]> {
  const client = createZendeskClient({ subdomain, email, apiToken });
  const response = await client.get<{ groups: ZendeskGroup[] }>("/groups.json");
  return response.groups;
}

export const getGroups = memoizee(fetchGroups, {
  maxAge: 60000,
  promise: true,
  length: 3,
});

async function fetchAgents(
  subdomain: string,
  email: string,
  apiToken: string,
): Promise<ZendeskUser[]> {
  const client = createZendeskClient({ subdomain, email, apiToken });
  const response = await client.get<{ users: ZendeskUser[] }>(
    "/users.json?role[]=agent&role[]=admin",
  );
  return response.users;
}

export const getAgents = memoizee(fetchAgents, {
  maxAge: 60000,
  promise: true,
  length: 3,
});
