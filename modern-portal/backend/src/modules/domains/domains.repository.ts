import { getDbPool, sql } from '../../common/database/db.js';
import { Domain, RegisterDomainDto } from './domains.model.js';

export class DomainsRepository {
  /**
   * Registers a domain record and invokes legacy Stored Procedure CreateDomains
   */
  async registerDomain(userId: number, clientIp: string, dto: RegisterDomainDto): Promise<number> {
    const pool = await getDbPool();
    const now = new Date();
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + (dto.domainYear || 1));

    const expiryDateStr = expiry.toISOString().slice(0, 10);
    const createdStr = now.toISOString().slice(0, 10);
    const refId = `DOM-${Date.now().toString().slice(-8)}`;

    const result = await pool
      .request()
      .input('UserId', sql.Decimal(18, 0), userId)
      .input('Reference', sql.Decimal(18, 0), 0)
      .input('DomainReferenceId', sql.VarChar, refId)
      .input('Password', sql.NVarChar, dto.authCode || 'Auth#12345')
      .input('RegReferenceId', sql.VarChar, '')
      .input('TechReferenceId', sql.VarChar, '')
      .input('AdminReferenceId', sql.VarChar, '')
      .input('BillingReferenceId', sql.VarChar, '')
      .input('Name', sql.NVarChar, dto.name.toLowerCase().trim())
      .input('DomainYear', sql.VarChar, String(dto.domainYear || 1))
      .input('IP', sql.VarChar, clientIp || '127.0.0.1')
      .input('ExpiryDate', sql.VarChar, expiryDateStr)
      .input('Documents', sql.NVarChar, '')
      .input('NameServerChoice', sql.Bit, true)
      .input('EligibilityId', sql.VarChar, '')
      .input('EligibilityType', sql.VarChar, '')
      .input('RegistrantName', sql.VarChar, '')
      .input('Status', sql.Bit, true)
      .input('Created', sql.VarChar, createdStr)
      .input('Modified', sql.VarChar, createdStr)
      .input('Deleted', sql.Bit, false)
      .input('Hosting', sql.Int, 0)
      .input('HostingYear', sql.Int, 0)
      .input('ExpiryDate1', sql.VarChar, expiryDateStr)
      .execute('CreateDomains');

    // Retrieve the created Domain Id
    const domainQuery = await pool
      .request()
      .input('Name', sql.NVarChar, dto.name.toLowerCase().trim())
      .query('SELECT TOP 1 Id FROM Domains WHERE Name = @Name ORDER BY Id DESC');

    const domainId = domainQuery.recordset[0]?.Id || 0;

    // Attach Nameservers if provided
    const nameservers = dto.nameServers && dto.nameServers.length > 0
      ? dto.nameServers
      : ['ns1.w3cloud.net', 'ns2.w3cloud.net'];

    for (const ns of nameservers) {
      await pool
        .request()
        .input('Name', sql.VarChar, ns)
        .input('DomainId', sql.Int, domainId)
        .execute('CreateNameServer');
    }

    return domainId;
  }

  /**
   * List all domains owned by a user
   */
  async getDomainsByUser(userId: number): Promise<Domain[]> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('UserId', sql.Decimal(18, 0), userId)
      .query(`
        SELECT Id, UserId, Name, DomainYear, ExpiryDate, Status, Created
        FROM Domains
        WHERE UserId = @UserId AND Deleted = 0
        ORDER BY Id DESC
      `);

    return result.recordset.map((row) => ({
      id: row.Id,
      userId: Number(row.UserId),
      name: row.Name,
      domainYear: parseInt(row.DomainYear, 10) || 1,
      expiryDate: row.ExpiryDate,
      status: row.Status,
      created: row.Created,
    }));
  }

  /**
   * Fetch nameservers for a specific domain
   */
  async getDomainNameservers(domainId: number): Promise<string[]> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('DomainId', sql.Int, domainId)
      .query('SELECT Name FROM NameServers WHERE DomainId = @DomainId');

    return result.recordset.map((r) => r.Name);
  }

  /**
   * Update nameservers for a domain
   */
  async updateNameservers(domainId: number, nameservers: string[]): Promise<void> {
    const pool = await getDbPool();
    // Clear old records
    await pool
      .request()
      .input('DomainId', sql.Int, domainId)
      .query('DELETE FROM NameServers WHERE DomainId = @DomainId');

    // Insert new nameserver records
    for (const ns of nameservers) {
      await pool
        .request()
        .input('Name', sql.VarChar, ns.trim())
        .input('DomainId', sql.Int, domainId)
        .execute('CreateNameServer');
    }
  }

  /**
   * Check if domain is already in the database
   */
  async isDomainTakenLocally(name: string): Promise<boolean> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('Name', sql.NVarChar, name.toLowerCase().trim())
      .query('SELECT TOP 1 Id FROM Domains WHERE Name = @Name AND Deleted = 0');

    return result.recordset.length > 0;
  }
}

