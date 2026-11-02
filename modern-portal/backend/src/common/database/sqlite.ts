import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbPath = path.resolve(process.cwd(), 'local-dev.db');
export const sqlite = new Database(dbPath);

export async function initLocalDevDb() {
  console.log(`📁 Initializing local SQLite database at: ${dbPath}`);

  // Create Tables matching SQL Server schema
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      RoleId INTEGER DEFAULT 2,
      ReferenceNo TEXT DEFAULT '',
      Reference NUMERIC DEFAULT 0,
      Name TEXT NOT NULL,
      Email TEXT UNIQUE NOT NULL,
      Password TEXT NOT NULL,
      Phone TEXT DEFAULT '',
      Address TEXT DEFAULT '',
      Street TEXT DEFAULT '',
      City TEXT DEFAULT '',
      Country TEXT DEFAULT '',
      Organisation TEXT DEFAULT '',
      Status INTEGER DEFAULT 1,
      Created TEXT,
      Modified TEXT,
      Deleted INTEGER DEFAULT 0,
      AltEmail TEXT DEFAULT '',
      SpecialPrice INTEGER DEFAULT 0,
      GSTIN TEXT DEFAULT '',
      State TEXT DEFAULT '',
      StateCode INTEGER DEFAULT 0,
      ParentId INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS SupportTickets (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Reference NUMERIC DEFAULT 0,
      ReferenceNo TEXT,
      ServiceTypeId INTEGER DEFAULT 1,
      ProductId INTEGER DEFAULT 0,
      Priority INTEGER DEFAULT 2,
      Subject TEXT NOT NULL,
      FilePath TEXT DEFAULT '',
      Description TEXT NOT NULL,
      Status INTEGER DEFAULT 1,
      CreatedBy INTEGER NOT NULL,
      Created TEXT,
      UserType INTEGER DEFAULT 1,
      Modified TEXT,
      PostedBy INTEGER
    );

    CREATE TABLE IF NOT EXISTS SupportTicketReplies (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      TicketsId INTEGER NOT NULL,
      Description TEXT NOT NULL,
      FilePath TEXT DEFAULT '',
      CreatedBy INTEGER NOT NULL,
      UserType INTEGER DEFAULT 1,
      Status INTEGER DEFAULT 1,
      Created TEXT
    );

    CREATE TABLE IF NOT EXISTS Invoices (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Reference INTEGER DEFAULT 0,
      ReferenceId TEXT NOT NULL,
      PONumber TEXT DEFAULT '',
      BillTo TEXT NOT NULL,
      BillDate TEXT NOT NULL,
      DueDate TEXT NOT NULL,
      UserId INTEGER NOT NULL,
      Status INTEGER DEFAULT 1,
      Created TEXT,
      Modified TEXT,
      Comments TEXT DEFAULT '',
      PaymentTerms TEXT DEFAULT 'Due on Receipt',
      ModeOfPayment TEXT DEFAULT 'Online',
      StatusOfInvoice TEXT DEFAULT 'Unpaid',
      InvoiceCurrency TEXT DEFAULT 'INR',
      RecieptNumber INTEGER DEFAULT 0,
      IsCancel INTEGER DEFAULT 0,
      International INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS InvoiceDetails (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      InvoiceId INTEGER NOT NULL,
      ItemId INTEGER DEFAULT 0,
      ServiceType INTEGER DEFAULT 0,
      StartDate TEXT,
      EndDate TEXT,
      Description TEXT NOT NULL,
      IsRenewal INTEGER DEFAULT 0,
      AnnualPrice TEXT NOT NULL,
      DiscountPrice TEXT DEFAULT '0',
      TotalPrice TEXT NOT NULL,
      ProductCode TEXT DEFAULT '',
      Quantity INTEGER DEFAULT 1,
      Duration INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS Domains (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      UserId INTEGER NOT NULL,
      Name TEXT UNIQUE NOT NULL,
      DomainYear TEXT DEFAULT '1',
      ExpiryDate TEXT NOT NULL,
      Status INTEGER DEFAULT 1,
      Created TEXT,
      Deleted INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS NameServers (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      DomainId INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS DomainTLDs (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      TLD TEXT UNIQUE NOT NULL,
      PriceINR REAL NOT NULL,
      PriceUSD REAL NOT NULL,
      PriceQAR REAL DEFAULT 0,
      Status INTEGER DEFAULT 1,
      Created TEXT
    );

    CREATE TABLE IF NOT EXISTS ResellerWallets (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      UserId INTEGER UNIQUE NOT NULL,
      Balance REAL DEFAULT 0,
      Currency TEXT DEFAULT 'INR',
      Updated TEXT
    );

    CREATE TABLE IF NOT EXISTS ResellerTransactions (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      UserId INTEGER NOT NULL,
      Amount REAL NOT NULL,
      Type TEXT NOT NULL, -- 'CREDIT' or 'DEBIT'
      Description TEXT NOT NULL,
      BalanceAfter REAL NOT NULL,
      Created TEXT
    );
  `);

  // Seed default admin and demo user if not present
  const adminCheck = sqlite.prepare('SELECT Id FROM Users WHERE Email = ?').get('admin@cloudportal.local');
  if (!adminCheck) {
    const adminPass = await bcrypt.hash('Admin@12345', 10);
    const userPass = await bcrypt.hash('User@12345', 10);
    const now = new Date().toISOString();

    const insertUser = sqlite.prepare(`
      INSERT INTO Users (RoleId, Name, Email, Password, Status, Created, Deleted)
      VALUES (?, ?, ?, ?, 1, ?, 0)
    `);

    insertUser.run(1, 'Super Administrator', 'admin@cloudportal.local', adminPass, now);
    insertUser.run(2, 'Demo Customer', 'customer@cloudportal.local', userPass, now);

    // Seed sample reseller
    const resellerPass = await bcrypt.hash('Reseller@12345', 10);
    const resellerInfo = insertUser.run(3, 'Demo Reseller Partner', 'reseller@cloudportal.local', resellerPass, now);

    // Seed reseller wallet with ₹25,000 opening credit balance
    sqlite.prepare(`
      INSERT OR IGNORE INTO ResellerWallets (UserId, Balance, Currency, Updated)
      VALUES (?, 25000, 'INR', ?)
    `).run(3, now);

    sqlite.prepare(`
      INSERT INTO ResellerTransactions (UserId, Amount, Type, Description, BalanceAfter, Created)
      VALUES (?, 25000, 'CREDIT', 'Opening Pre-Paid Balance', 25000, ?)
    `).run(3, now);

    // Seed sub-client for demo reseller (ParentId = 3)
    const clientPass = await bcrypt.hash('Client@12345', 10);
    sqlite.prepare(`
      INSERT INTO Users (RoleId, Name, Email, Password, Status, Created, Deleted, ParentId)
      VALUES (2, 'Acme Retail Corp (Client)', 'acme@client.local', ?, 1, ?, 0, 3)
    `).run(clientPass, now);

    // Seed default TLDs with admin managed prices
    const insertTLD = sqlite.prepare(`
      INSERT INTO DomainTLDs (TLD, PriceINR, PriceUSD, Status, Created)
      VALUES (?, ?, ?, 1, ?)
    `);
    insertTLD.run('.com', 999, 12.99, now);
    insertTLD.run('.in', 599, 7.99, now);
    insertTLD.run('.net', 1149, 14.99, now);
    insertTLD.run('.org', 1199, 15.99, now);
    insertTLD.run('.co.in', 499, 6.99, now);
    insertTLD.run('.io', 3499, 44.99, now);

    // Seed sample invoice
    sqlite.prepare(`
      INSERT INTO Invoices (ReferenceId, BillTo, BillDate, DueDate, UserId, StatusOfInvoice, InvoiceCurrency, Created)
      VALUES ('INV-TEST001', 'Demo Customer Ltd', '2026-11-01', '2026-11-15', 2, 'Unpaid', 'INR', ?)
    `).run(now);

    // Seed sample ticket
    sqlite.prepare(`
      INSERT INTO SupportTickets (ReferenceNo, Subject, Description, Priority, Status, CreatedBy, Created)
      VALUES ('TKT-1001', 'Domain delegation setup query', 'How do I point my domain to custom nameservers?', 2, 1, 2, ?)
    `).run(now);

    console.log('🌱 Seeded local database with default users and records.');
  }

  console.log('✅ Local test database ready.');
}

