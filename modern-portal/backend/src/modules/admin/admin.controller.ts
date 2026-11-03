import { Response } from 'express';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';
import { sqlite } from '../../common/database/sqlite.js';

export async function getDashboardOverview(req: AuthenticatedRequest, res: Response) {
  try {
    const totalUsers: any = sqlite.prepare('SELECT COUNT(1) AS cnt FROM Users WHERE Deleted = 0').get();
    const totalInvoices: any = sqlite.prepare('SELECT COUNT(1) AS cnt FROM Invoices WHERE IsCancel = 0').get();
    const unpaidInvoices: any = sqlite.prepare("SELECT COUNT(1) AS cnt FROM Invoices WHERE StatusOfInvoice = 'Unpaid' AND IsCancel = 0").get();
    const openTickets: any = sqlite.prepare('SELECT COUNT(1) AS cnt FROM SupportTickets WHERE Status = 1').get();

    return res.json({
      stats: {
        totalUsers: totalUsers.cnt,
        totalInvoices: totalInvoices.cnt,
        unpaidInvoices: unpaidInvoices.cnt,
        openTickets: openTickets.cnt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch admin stats', error: err.message });
  }
}

export async function listAllUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const users = sqlite
      .prepare('SELECT Id, RoleId, Name, Email, Phone, Status, Created FROM Users WHERE Deleted = 0 ORDER BY Id DESC')
      .all();
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
}

export async function updateUserStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = parseInt(req.params.id, 10);
    const { status } = req.body;
    sqlite.prepare('UPDATE Users SET Status = ? WHERE Id = ?').run(status ? 1 : 0, userId);
    return res.json({ message: `User status updated` });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
}

// ADMIN TLD & PRICING CONTROLS
export async function listAllTLDs(req: AuthenticatedRequest, res: Response) {
  try {
    const tlds = sqlite.prepare('SELECT * FROM DomainTLDs ORDER BY TLD ASC').all();
    return res.json({ tlds });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch TLDs', error: err.message });
  }
}

export async function createOrUpdateTLD(req: AuthenticatedRequest, res: Response) {
  try {
    const { tld, priceINR, priceUSD, status } = req.body;
    if (!tld || priceINR === undefined) {
      return res.status(400).json({ message: 'TLD (e.g. .com) and priceINR are required' });
    }

    const cleanTld = tld.startsWith('.') ? tld.toLowerCase().trim() : `.${tld.toLowerCase().trim()}`;
    const existing: any = sqlite.prepare('SELECT Id FROM DomainTLDs WHERE TLD = ?').get(cleanTld);
    const now = new Date().toISOString();

    if (existing) {
      sqlite.prepare(`
        UPDATE DomainTLDs 
        SET PriceINR = ?, PriceUSD = ?, Status = ?
        WHERE Id = ?
      `).run(Number(priceINR), Number(priceUSD || 0), status !== undefined ? (status ? 1 : 0) : 1, existing.Id);
      return res.json({ message: `TLD ${cleanTld} pricing updated successfully` });
    } else {
      sqlite.prepare(`
        INSERT INTO DomainTLDs (TLD, PriceINR, PriceUSD, Status, Created)
        VALUES (?, ?, ?, ?, ?)
      `).run(cleanTld, Number(priceINR), Number(priceUSD || 0), status !== undefined ? (status ? 1 : 0) : 1, now);
      return res.status(201).json({ message: `TLD ${cleanTld} added successfully` });
    }
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to save TLD', error: err.message });
  }
}

export async function deleteTLD(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    sqlite.prepare('DELETE FROM DomainTLDs WHERE Id = ?').run(id);
    return res.json({ message: 'TLD deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to delete TLD', error: err.message });
  }
}

// W3INFOTECH UPSTREAM BRIDGE CONTROLS
export async function getUpstreamStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { getW3ResellerConfig } = await import('../domains/upstream/w3infotech.config.js');
    const { w3ResellerBridge } = await import('../domains/upstream/w3infotech-reseller.service.js');
    const config = getW3ResellerConfig();

    // Check if real credentials are provided
    const isConfigured = Boolean(config.username && config.password);

    return res.json({
      status: {
        connected: isConfigured,
        username: config.username || 'Not configured',
        creditBalance: config.initialBalance || 0,
        currency: 'INR',
        lastSync: new Date().toISOString(),
        note: isConfigured 
          ? 'Live Reseller account configured for automated order dispatching'
          : 'Please set W3_RESELLER_USER and W3_RESELLER_PASSWORD in .env',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to get upstream bridge status', error: err.message });
  }
}
