import { Response } from 'express';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';
import { ResellerRepository } from './reseller.repository.js';
import { sqlite } from '../../common/database/sqlite.js';

const resellerRepo = new ResellerRepository();

export async function getResellerSubClients(req: AuthenticatedRequest, res: Response) {
  try {
    const resellerId = req.user!.id;
    const clients = await resellerRepo.getSubClients(resellerId);
    return res.json({ clients });
  } catch (err: any) {
    console.error('Error fetching reseller clients:', err);
    return res.status(500).json({ message: 'Failed to fetch sub-clients', error: err.message });
  }
}

export async function getPricingRules(req: AuthenticatedRequest, res: Response) {
  try {
    const resellerId = req.user!.id;
    const pricing = await resellerRepo.getPricing(resellerId);
    return res.json({ pricing });
  } catch (err: any) {
    console.error('Error fetching reseller pricing:', err);
    return res.status(500).json({ message: 'Failed to fetch pricing rules', error: err.message });
  }
}

export async function updatePricingRule(req: AuthenticatedRequest, res: Response) {
  try {
    const resellerId = req.user!.id;
    const { priceType, priceValue } = req.body;

    if (priceType === undefined || priceValue === undefined) {
      return res.status(400).json({ message: 'priceType and priceValue are required' });
    }

    await resellerRepo.setPricing({
      userId: resellerId,
      priceType: Number(priceType),
      priceValue: Number(priceValue),
    });

    return res.json({ message: 'Reseller pricing rule updated successfully' });
  } catch (err: any) {
    console.error('Error updating pricing rule:', err);
    return res.status(500).json({ message: 'Failed to update pricing rule', error: err.message });
  }
}

// RESELLER WALLET & FUND CONTROLS
export async function getResellerWallet(req: AuthenticatedRequest, res: Response) {
  try {
    const resellerId = req.user!.id;
    let wallet: any = sqlite.prepare('SELECT * FROM ResellerWallets WHERE UserId = ?').get(resellerId);
    if (!wallet) {
      sqlite.prepare('INSERT INTO ResellerWallets (UserId, Balance, Currency, Updated) VALUES (?, 0, ?, ?)')
        .run(resellerId, 'INR', new Date().toISOString());
      wallet = { UserId: resellerId, Balance: 0, Currency: 'INR' };
    }

    const transactions = sqlite
      .prepare('SELECT * FROM ResellerTransactions WHERE UserId = ? ORDER BY Id DESC LIMIT 20')
      .all(resellerId);

    return res.json({ wallet, transactions });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch wallet', error: err.message });
  }
}

export async function addFundsToWallet(req: AuthenticatedRequest, res: Response) {
  try {
    const resellerId = req.user!.id;
    const { amount, paymentReference } = req.body;
    const addAmt = Number(amount);

    if (isNaN(addAmt) || addAmt <= 0) {
      return res.status(400).json({ message: 'Valid positive deposit amount is required' });
    }

    let wallet: any = sqlite.prepare('SELECT Balance FROM ResellerWallets WHERE UserId = ?').get(resellerId);
    const newBal = (wallet?.Balance || 0) + addAmt;
    const now = new Date().toISOString();

    sqlite.prepare('UPDATE ResellerWallets SET Balance = ?, Updated = ? WHERE UserId = ?').run(newBal, now, resellerId);
    sqlite.prepare(`
      INSERT INTO ResellerTransactions (UserId, Amount, Type, Description, BalanceAfter, Created)
      VALUES (?, ?, 'CREDIT', ?, ?, ?)
    `).run(resellerId, addAmt, `Pre-paid deposit Ref: ${paymentReference || 'Online Payment'}`, newBal, now);

    return res.json({ message: `Funds added successfully! New Balance: ₹${newBal}`, newBalance: newBal });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to add funds', error: err.message });
  }
}

export async function createSubClient(req: AuthenticatedRequest, res: Response) {
  try {
    const resellerId = req.user!.id;
    const { name, email, password, phone, country } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing: any = sqlite.prepare('SELECT Id FROM Users WHERE Email = ?').get(email);
    if (existing) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash(password, 10);
    const now = new Date().toISOString();

    const info = sqlite.prepare(`
      INSERT INTO Users (RoleId, Name, Email, Password, Phone, Country, Status, Created, Deleted, ParentId)
      VALUES (2, ?, ?, ?, ?, ?, 1, ?, 0, ?)
    `).run(name, email, hashedPassword, phone || '', country || '', now, resellerId);

    return res.status(201).json({ message: 'Sub-client account created successfully', clientId: info.lastInsertRowid });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to create sub-client', error: err.message });
  }
}

