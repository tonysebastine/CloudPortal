import { getDbPool, sql } from '../../common/database/db.js';
import {
  CreateInvoiceDto,
  CreateTransactionDto,
  Invoice,
  InvoiceItem,
  Transaction,
} from './billing.model.js';

export class BillingRepository {
  /**
   * Creates an invoice and its line items using legacy stored procedures:
   * CreateInvoices_Int and CreateInvoiceDetails_Int
   */
  async createInvoice(userId: number, dto: CreateInvoiceDto): Promise<number> {
    const pool = await getDbPool();
    const now = new Date();
    const billDate = now.toISOString().slice(0, 10);
    const referenceId = `INV-${Date.now().toString().slice(-8)}`;

    const invResult = await pool
      .request()
      .input('Reference', sql.Int, 0)
      .input('ReferenceId', sql.VarChar, referenceId)
      .input('PONumber', sql.VarChar, dto.poNumber || '')
      .input('BillTo', sql.NText, dto.billTo)
      .input('BillDate', sql.VarChar, billDate)
      .input('DueDate', sql.VarChar, dto.dueDate || billDate)
      .input('UserId', sql.Int, userId)
      .input('Status', sql.Bit, true)
      .input('Created', sql.DateTime, now)
      .input('Modified', sql.DateTime, now)
      .input('Comments', sql.VarChar, dto.comments || '')
      .input('PaymentTerms', sql.VarChar, dto.paymentTerms || 'Due on Receipt')
      .input('ModeOfPayment', sql.VarChar, dto.modeOfPayment || 'Online')
      .input('StatusOfInvoice', sql.VarChar, 'Unpaid')
      .input('InvoiceCurrency', sql.VarChar, dto.invoiceCurrency || 'INR')
      .input('RecieptNumber', sql.Int, 0)
      .input('IsCancel', sql.Bit, false)
      .input('International', sql.Bit, false)
      .output('Id', sql.Int)
      .execute('CreateInvoices_Int');

    const invoiceId = invResult.output.Id;

    // Create line items
    for (const item of dto.items) {
      await pool
        .request()
        .input('InvoiceId', sql.Int, invoiceId)
        .input('ItemId', sql.Int, item.itemId || 0)
        .input('ServiceType', sql.Bit, item.serviceType || false)
        .input('StartDate', sql.VarChar, item.startDate || billDate)
        .input('EndDate', sql.VarChar, item.endDate || billDate)
        .input('Description', sql.NVarChar, item.description)
        .input('IsRenewal', sql.Int, 0)
        .input('AnnualPrice', sql.NVarChar, String(item.annualPrice))
        .input('DiscountPrice', sql.NVarChar, String(item.discountPrice || 0))
        .input('TotalPrice', sql.NVarChar, String(item.totalPrice))
        .input('ProductCode', sql.NVarChar, item.productCode || '')
        .input('ArDescription', sql.NVarChar, '')
        .input('Quantity', sql.Int, item.quantity || 1)
        .input('Duration', sql.Int, item.duration || 1)
        .execute('CreateInvoiceDetails_Int');
    }

    return invoiceId;
  }

  /**
   * List all invoices for a user
   */
  async getInvoicesByUser(userId: number): Promise<Invoice[]> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('UserId', sql.Int, userId)
      .query(`
        SELECT Id, ReferenceId, PONumber, BillTo, BillDate, DueDate, UserId, Status,
               StatusOfInvoice, InvoiceCurrency, RecieptNumber, IsCancel, International, Created
        FROM Invoices
        WHERE UserId = @UserId
        ORDER BY Created DESC
      `);

    return result.recordset.map((row) => ({
      id: row.Id,
      referenceId: row.ReferenceId,
      poNumber: row.PONumber,
      billTo: row.BillTo,
      billDate: row.BillDate,
      dueDate: row.DueDate,
      userId: row.UserId,
      status: row.Status,
      statusOfInvoice: row.StatusOfInvoice,
      invoiceCurrency: row.InvoiceCurrency,
      recieptNumber: row.RecieptNumber,
      isCancel: row.IsCancel,
      international: row.International,
      created: row.Created?.toISOString?.() || String(row.Created),
    }));
  }

  /**
   * Get full invoice details including line items
   */
  async getInvoiceById(invoiceId: number): Promise<Invoice | null> {
    const pool = await getDbPool();
    const invRes = await pool
      .request()
      .input('Id', sql.Int, invoiceId)
      .query(`SELECT TOP 1 * FROM Invoices WHERE Id = @Id`);

    if (invRes.recordset.length === 0) return null;
    const row = invRes.recordset[0];

    // Fetch line items
    const itemsRes = await pool
      .request()
      .input('InvoiceId', sql.Int, invoiceId)
      .query(`SELECT * FROM InvoiceDetails WHERE InvoiceId = @InvoiceId`);

    const items: InvoiceItem[] = itemsRes.recordset.map((item) => ({
      id: item.Id,
      invoiceId: item.InvoiceId,
      itemId: item.ItemId,
      serviceType: item.ServiceType,
      description: item.Description,
      annualPrice: parseFloat(item.AnnualPrice) || 0,
      discountPrice: parseFloat(item.DiscountPrice) || 0,
      totalPrice: parseFloat(item.TotalPrice) || 0,
      quantity: item.Quantity,
      duration: item.Duration,
      productCode: item.ProductCode,
    }));

    const totalAmount = items.reduce((sum, it) => sum + it.totalPrice, 0);

    return {
      id: row.Id,
      referenceId: row.ReferenceId,
      poNumber: row.PONumber,
      billTo: row.BillTo,
      billDate: row.BillDate,
      dueDate: row.DueDate,
      userId: row.UserId,
      status: row.Status,
      statusOfInvoice: row.StatusOfInvoice,
      invoiceCurrency: row.InvoiceCurrency,
      recieptNumber: row.RecieptNumber,
      isCancel: row.IsCancel,
      international: row.International,
      items,
      totalAmount,
      created: row.Created?.toISOString?.() || String(row.Created),
    };
  }

  /**
   * Records a payment transaction and marks invoice as Paid if successful
   */
  async recordPayment(userId: number, ip: string, dto: CreateTransactionDto): Promise<number> {
    const pool = await getDbPool();
    const now = new Date();

    const result = await pool
      .request()
      .input('ReferenceId', sql.VarChar, dto.referenceId)
      .input('Amount', sql.VarChar, String(dto.amount))
      .input('Description', sql.VarChar, dto.description || 'Invoice Payment')
      .input('StatusMessage', sql.VarChar, dto.statusMessage || 'Success')
      .input('Currency', sql.VarChar, dto.currency)
      .input('UserId', sql.Int, userId)
      .input('InvoiceId', sql.Int, dto.invoiceId)
      .input('Status', sql.Bit, true)
      .input('Created', sql.DateTime, now)
      .input('IP', sql.VarChar, ip || '127.0.0.1')
      .output('Id', sql.Int)
      .execute('CreateTransactions_Int');

    // Update invoice status to Paid
    await pool
      .request()
      .input('InvoiceId', sql.Int, dto.invoiceId)
      .input('StatusOfInvoice', sql.VarChar, 'Paid')
      .query(`UPDATE Invoices SET StatusOfInvoice = @StatusOfInvoice WHERE Id = @InvoiceId`);

    return result.output.Id;
  }
}

