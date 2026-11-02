import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import {
  createTicket,
  getTicketDetails,
  listMyTickets,
  replyToTicket,
} from './tickets.controller.js';

export const ticketsRouter = Router();

// All ticket routes require authentication
ticketsRouter.use(requireAuth);

ticketsRouter.get('/', listMyTickets);
ticketsRouter.post('/', createTicket);
ticketsRouter.get('/:id', getTicketDetails);
ticketsRouter.post('/:id/replies', replyToTicket);

