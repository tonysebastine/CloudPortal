import { getDbPool, sql } from '../../common/database/db.js';

export interface AdminStats {
  totalUsers: number;
  totalInvoices: number;
  totalTickets: number;
  unpaidInvoices: number;
  openTickets: number;
}

export class AdminRepository {
  async getDashboardStats(): Promise<AdminStats> {
    const pool = await getDbPool();

    const usersCount = await pool.request().query('SELECT COUNT(1) AS cnt FROM Users WHERE Deleted = 0');
    const invCount = await pool.request().query('SELECT COUNT(1) AS cnt FROM Invoices WHERE IsCancel = 0');
    const unpaidCount = await pool.request().query("SELECT COUNT(1) AS cnt FROM Invoices WHERE StatusOfInvoice = 'Unpaid' AND IsCancel = 0");
    const ticketsCount = await pool.request().query('SELECT COUNT(1) AS cnt FROM SupportTickets');
    const openTicketsCount = await pool.request().query('SELECT COUNT(1) AS cnt FROM SupportTickets WHERE Status = 1');

    return {
      totalUsers: usersCount.recordset[0].cnt || 0,
      totalInvoices: invCount.recordset[0].cnt || 0,
      unpaidInvoices: unpaidCount.recordset[0].cnt || 0,
      totalTickets: ticketsCount.recordset[0].cnt || 0,
      openTickets: openTicketsCount.recordset[0].cnt || 0,
    };
  }

  async getAllUsers(page: number = 1, pageSize: number = 20) {
    const pool = await getDbPool();
    const offset = (page - 1) * pageSize;

    const result = await pool
      .request()
      .input('Offset', sql.Int, offset)
      .input('PageSize', sql.Int, pageSize)
      .query(`
        SELECT Id, RoleId, Name, Email, Phone, Country, Organisation, Status, Created
        FROM Users
        WHERE Deleted = 0
        ORDER BY Created DESC
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
      `);

    return result.recordset;
  }

  async toggleUserStatus(userId: number, status: boolean) {
    const pool = await getDbPool();
    await pool
      .request()
      .input('Id', sql.Int, userId)
      .input('Status', sql.Bit, status)
      .query('UPDATE Users SET Status = @Status WHERE Id = @Id');
  }
}

