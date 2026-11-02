import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';
import { sqlite } from '../../common/database/sqlite.js';
import { DomainLookupService } from './domains.service.js';

const lookupService = new DomainLookupService();

export async function checkDomainAvailability(req: Request, res: Response) {
  try {
    const domain = req.query.domain as string;
    if (!domain) return res.status(400).json({ message: 'domain query parameter is required' });

    const localCheck = sqlite.prepare('SELECT Id FROM Domains WHERE Name = ?').get(domain.toLowerCase().trim());
    if (localCheck) {
      return res.json({ domain, available: false, pricePerYear: 999, currency: 'INR' });
    }

    const check = await lookupService.checkAvailability(domain);
    return res.json(check);
  } catch (err: any) {
    return res.status(500).json({ message: 'Domain check failed', error: err.message });
  }
}

export async function listMyDomains(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const domains = sqlite
      .prepare('SELECT * FROM Domains WHERE UserId = ? AND Deleted = 0 ORDER BY Id DESC')
      .all(userId);
    return res.json({ domains });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to list domains', error: err.message });
  }
}

export async function registerDomain(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { name, domainYear } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const cleanName = name.toLowerCase().trim();
    const existing = sqlite.prepare('SELECT Id FROM Domains WHERE Name = ?').get(cleanName);
    if (existing) return res.status(409).json({ message: 'Domain is already registered' });

    // 1. Dispatch registration to Upstream W3Infotech Reseller Bridge
    const { w3ResellerBridge } = await import('./upstream/w3infotech-reseller.service.js');
    const upstreamResult = await w3ResellerBridge.registerDomainOrder(cleanName, Number(domainYear) || 1);

    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + (domainYear || 1));
    const now = new Date().toISOString().slice(0, 10);

    const info = sqlite.prepare(`
      INSERT INTO Domains (UserId, Name, DomainYear, ExpiryDate, Status, Created, Deleted)
      VALUES (?, ?, ?, ?, 1, ?, 0)
    `).run(userId, cleanName, String(domainYear || 1), expiry.toISOString().slice(0, 10), now);

    return res.status(201).json({
      message: 'Domain registered successfully via upstream W3Infotech reseller account',
      domainId: info.lastInsertRowid,
      upstreamReference: upstreamResult.referenceId,
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Domain registration failed', error: err.message });
  }
}

export async function transferDomain(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { name, authCode, domainYear } = req.body;
    if (!name || !authCode) {
      return res.status(400).json({ message: 'Domain name and EPP Auth/Secret code are required' });
    }

    const cleanName = name.toLowerCase().trim();
    const existing = sqlite.prepare('SELECT Id FROM Domains WHERE Name = ?').get(cleanName);
    if (existing) {
      return res.status(409).json({ message: 'Domain is already hosted or registered locally' });
    }

    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + (domainYear || 1));
    const now = new Date().toISOString().slice(0, 10);

    const info = sqlite.prepare(`
      INSERT INTO Domains (UserId, Name, DomainYear, ExpiryDate, Status, Created, Deleted)
      VALUES (?, ?, ?, ?, 1, ?, 0)
    `).run(userId, cleanName, String(domainYear || 1), expiry.toISOString().slice(0, 10), now);

    return res.status(201).json({
      message: `Domain ${cleanName} transfer initiated successfully with EPP Auth Code`,
      domainId: info.lastInsertRowid,
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Domain transfer request failed', error: err.message });
  }
}

export async function renewDomain(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const domainId = parseInt(req.params.id, 10);
    const { additionalYears } = req.body;
    const years = Number(additionalYears) || 1;

    const domain: any = sqlite.prepare('SELECT * FROM Domains WHERE Id = ?').get(domainId);
    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    // Role check: customer can only renew their own domains
    if (req.user!.roleId === 2 && domain.UserId !== userId) {
      return res.status(403).json({ message: 'Access denied to this domain' });
    }

    const currentExpiry = new Date(domain.ExpiryDate);
    const newExpiry = new Date(currentExpiry);
    newExpiry.setFullYear(newExpiry.getFullYear() + years);
    const newExpiryStr = newExpiry.toISOString().slice(0, 10);

    sqlite.prepare('UPDATE Domains SET ExpiryDate = ?, DomainYear = CAST((CAST(DomainYear AS INT) + ?) AS TEXT) WHERE Id = ?')
      .run(newExpiryStr, years, domainId);

    return res.json({
      message: `Domain renewed for ${years} additional year(s)`,
      newExpiryDate: newExpiryStr,
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Renewal failed', error: err.message });
  }
}

export async function getNameservers(req: AuthenticatedRequest, res: Response) {
  try {
    const domainId = parseInt(req.params.id, 10);
    const ns = sqlite.prepare('SELECT Name FROM NameServers WHERE DomainId = ?').all(domainId);
    return res.json({ domainId, nameservers: ns.map((r: any) => r.Name) });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch nameservers', error: err.message });
  }
}

export async function updateNameservers(req: AuthenticatedRequest, res: Response) {
  try {
    const domainId = parseInt(req.params.id, 10);
    const { nameservers } = req.body;
    if (!Array.isArray(nameservers)) return res.status(400).json({ message: 'nameservers array required' });

    sqlite.prepare('DELETE FROM NameServers WHERE DomainId = ?').run(domainId);
    const insertNs = sqlite.prepare('INSERT INTO NameServers (Name, DomainId) VALUES (?, ?)');
    for (const ns of nameservers) {
      insertNs.run(ns, domainId);
    }
    return res.json({ message: 'Nameservers updated' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to update nameservers', error: err.message });
  }
}
