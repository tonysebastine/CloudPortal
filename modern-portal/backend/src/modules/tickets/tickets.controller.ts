import { Response } from 'express';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';
import { sqlite } from '../../common/database/sqlite.js';

export async function listMyTickets(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const tickets = sqlite
      .prepare('SELECT * FROM SupportTickets WHERE CreatedBy = ? ORDER BY Id DESC')
      .all(userId);
    return res.json({ tickets });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch tickets', error: err.message });
  }
}

export async function getTicketDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const ticket: any = sqlite.prepare('SELECT * FROM SupportTickets WHERE Id = ?').get(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const replies = sqlite
      .prepare('SELECT * FROM SupportTicketReplies WHERE TicketsId = ? ORDER BY Id ASC')
      .all(ticketId);

    return res.json({ ticket, replies });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch ticket details', error: err.message });
  }
}

export async function createTicket(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { subject, description, priority } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    const refNo = `TKT-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO SupportTickets (ReferenceNo, Subject, Description, Priority, Status, CreatedBy, Created)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run(refNo, subject, description, priority || 2, userId, now);

    return res.status(201).json({ message: 'Support ticket submitted successfully' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to create ticket', error: err.message });
  }
}

export async function replyToTicket(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const ticketId = parseInt(req.params.id, 10);
    const { description } = req.body;
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO SupportTicketReplies (TicketsId, Description, CreatedBy, UserType, Status, Created)
      VALUES (?, ?, ?, 1, 1, ?)
    `).run(ticketId, description, userId, now);

    return res.status(201).json({ message: 'Reply posted successfully' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to add reply', error: err.message });
  }
}
