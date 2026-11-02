import { getDbPool, sql } from '../../common/database/db.js';
import { CreateTicketDto, CreateTicketReplyDto, Ticket, TicketReply } from './tickets.model.js';

export class TicketsRepository {
  /**
   * Calls legacy stored procedure CreateSupportTickets
   */
  async createTicket(userId: number, dto: CreateTicketDto): Promise<void> {
    const pool = await getDbPool();
    const now = new Date();
    const referenceNo = `TKT-${Date.now().toString().slice(-6)}`;

    await pool
      .request()
      .input('Reference', sql.Decimal(18, 2), 0)
      .input('ReferenceNo', sql.VarChar, referenceNo)
      .input('ServiceTypeId', sql.Int, dto.serviceTypeId || 1)
      .input('ProductId', sql.Int, dto.productId || 0)
      .input('Priority', sql.Int, dto.priority || 2)
      .input('Subject', sql.NText, dto.subject)
      .input('FilePath', sql.NText, dto.filePath || '')
      .input('Description', sql.NText, dto.description)
      .input('Status', sql.Bit, true)
      .input('CreatedBy', sql.Int, userId)
      .input('Created', sql.DateTime, now)
      .input('UserType', sql.Bit, true) // customer
      .input('Modified', sql.DateTime, now)
      .input('PostedBy', sql.Int, userId)
      .execute('CreateSupportTickets');
  }

  /**
   * Fetch tickets created by a specific user
   */
  async getTicketsByUser(userId: number): Promise<Ticket[]> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('UserId', sql.Int, userId)
      .query(`
        SELECT Id, Reference, ReferenceNo, ServiceTypeId, ProductId, Priority, 
               Subject, Description, FilePath, Status, CreatedBy, Created, Modified, PostedBy
        FROM SupportTickets
        WHERE CreatedBy = @UserId
        ORDER BY Created DESC
      `);

    return result.recordset.map((row) => ({
      id: row.Id,
      reference: row.Reference,
      referenceNo: row.ReferenceNo,
      serviceTypeId: row.ServiceTypeId,
      productId: row.ProductId,
      priority: row.Priority,
      subject: row.Subject,
      description: row.Description,
      filePath: row.FilePath,
      status: row.Status,
      createdBy: row.CreatedBy,
      created: row.Created?.toISOString?.() || String(row.Created),
      modified: row.Modified?.toISOString?.() || String(row.Modified),
      postedBy: row.PostedBy,
    }));
  }

  /**
   * Get ticket details by ID
   */
  async getTicketById(ticketId: number): Promise<Ticket | null> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('Id', sql.Int, ticketId)
      .query(`SELECT TOP 1 * FROM SupportTickets WHERE Id = @Id`);

    if (result.recordset.length === 0) return null;
    const row = result.recordset[0];
    return {
      id: row.Id,
      reference: row.Reference,
      referenceNo: row.ReferenceNo,
      serviceTypeId: row.ServiceTypeId,
      productId: row.ProductId,
      priority: row.Priority,
      subject: row.Subject,
      description: row.Description,
      filePath: row.FilePath,
      status: row.Status,
      createdBy: row.CreatedBy,
      created: row.Created?.toISOString?.() || String(row.Created),
      modified: row.Modified?.toISOString?.() || String(row.Modified),
      postedBy: row.PostedBy,
    };
  }

  /**
   * Fetch conversation replies for a ticket
   */
  async getTicketReplies(ticketId: number): Promise<TicketReply[]> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('TicketId', sql.Int, ticketId)
      .query(`
        SELECT Id, TicketsId, Description, FilePath, CreatedBy, UserType, Status, Created
        FROM SupportTicketReplies
        WHERE TicketsId = @TicketId
        ORDER BY Created ASC
      `);

    return result.recordset.map((row) => ({
      id: row.Id,
      ticketsId: row.TicketsId,
      description: row.Description,
      filePath: row.FilePath,
      createdBy: row.CreatedBy,
      userType: row.UserType,
      status: row.Status,
      created: row.Created?.toISOString?.() || String(row.Created),
    }));
  }

  /**
   * Post a reply to an existing support ticket
   */
  async addReply(userId: number, isCustomer: boolean, dto: CreateTicketReplyDto): Promise<void> {
    const pool = await getDbPool();
    const now = new Date();

    await pool
      .request()
      .input('TicketsId', sql.Int, dto.ticketsId)
      .input('Description', sql.NText, dto.description)
      .input('FilePath', sql.NText, dto.filePath || '')
      .input('CreatedBy', sql.Int, userId)
      .input('UserType', sql.Bit, isCustomer)
      .input('Status', sql.Bit, true)
      .input('Created', sql.DateTime, now)
      .execute('CreateSupportTicketsReply');
  }
}

