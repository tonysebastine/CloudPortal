import { Response } from 'express';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';
import { sqlite } from '../../common/database/sqlite.js';

export async function listMyInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const invoices = sqlite
      .prepare('SELECT * FROM Invoices WHERE UserId = ? ORDER BY Id DESC')
      .all(userId);
    return res.json({ invoices });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch invoices', error: err.message });
  }
}

export async function getInvoiceDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const invoiceId = parseInt(req.params.id, 10);
    const invoice: any = sqlite.prepare('SELECT * FROM Invoices WHERE Id = ?').get(invoiceId);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    const items = sqlite.prepare('SELECT * FROM InvoiceDetails WHERE InvoiceId = ?').all(invoiceId);
    return res.json({ invoice, items });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch invoice', error: err.message });
  }
}

export async function createInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { billTo, dueDate, items, invoiceCurrency } = req.body;

    const refId = `INV-${Date.now().toString().slice(-8)}`;
    const now = new Date().toISOString().slice(0, 10);

    const info = sqlite.prepare(`
      INSERT INTO Invoices (ReferenceId, BillTo, BillDate, DueDate, UserId, StatusOfInvoice, InvoiceCurrency, Created)
      VALUES (?, ?, ?, ?, ?, 'Unpaid', ?, ?)
    `).run(refId, billTo, now, dueDate || now, userId, invoiceCurrency || 'INR', now);

    const invoiceId = info.lastInsertRowid;

    if (items && Array.isArray(items)) {
      const insertItem = sqlite.prepare(`
        INSERT INTO InvoiceDetails (InvoiceId, Description, AnnualPrice, TotalPrice, Quantity)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const it of items) {
        insertItem.run(invoiceId, it.description, String(it.annualPrice), String(it.totalPrice), it.quantity || 1);
      }
    }

    return res.status(201).json({ message: 'Invoice created successfully', invoiceId });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to create invoice', error: err.message });
  }
}

export async function payInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const invoiceId = parseInt(req.params.id, 10);
    sqlite.prepare("UPDATE Invoices SET StatusOfInvoice = 'Paid' WHERE Id = ?").run(invoiceId);
    return res.json({ message: 'Invoice marked as Paid', invoiceId });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to pay invoice', error: err.message });
  }
}
