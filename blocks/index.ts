// Ticket action blocks
import { createTicket } from "./tickets/createTicket";
import { updateTicket } from "./tickets/updateTicket";
import { getTicket } from "./tickets/getTicket";
import { addComment } from "./tickets/addComment";
import { searchTickets } from "./tickets/searchTickets";
import { transitionTicket } from "./tickets/transitionTicket";
import { assignTicket } from "./tickets/assignTicket";

// Webhook subscription blocks
import { ticketCreated } from "./webhooks/ticketCreated";
import { ticketUpdated } from "./webhooks/ticketUpdated";
import { commentAdded } from "./webhooks/commentAdded";
import { catchAllSubscription } from "./webhooks/catchAllSubscription";

// Escape hatch
import { httpRequest } from "./request/httpRequest";

export const blocks = {
  // Ticket Management
  createTicket,
  updateTicket,
  getTicket,
  addComment,
  searchTickets,
  transitionTicket,
  assignTicket,

  // Webhook Events
  ticketCreated,
  ticketUpdated,
  commentAdded,
  catchAllSubscription,

  // Request
  httpRequest,
} as const;
