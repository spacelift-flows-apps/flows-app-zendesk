import { getAgents, getGroups } from "./zendeskClient";

async function suggestAgents(input: any) {
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
    values = values.filter((v) => v.label.toLowerCase().includes(searchLower));
  }

  return { suggestedValues: values.slice(0, 50) };
}

async function suggestGroups(input: any) {
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
    values = values.filter((v) => v.label.toLowerCase().includes(searchLower));
  }

  return { suggestedValues: values.slice(0, 50) };
}

export const assigneeConfig = {
  name: "Assignee",
  description: "The agent to assign the ticket to",
  type: "string" as const,
  required: false as const,
  suggestValues: suggestAgents,
};

export const groupConfig = {
  name: "Group",
  description: "The group to assign the ticket to",
  type: "string" as const,
  required: false as const,
  suggestValues: suggestGroups,
};
