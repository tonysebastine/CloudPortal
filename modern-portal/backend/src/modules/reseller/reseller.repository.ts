import { getDbPool, sql } from '../../common/database/db.js';

export interface UserPricing {
  id?: number;
  userId: number;
  priceType: number; // e.g., 1: Domain Markup %, 2: Fixed markup, 3: Hosting discount %
  priceValue: number;
}

export class ResellerRepository {
  /**
   * Sets or updates custom pricing markup for a reseller
   */
  async setPricing(dto: UserPricing): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('UserId', sql.Decimal(18, 0), dto.userId)
      .input('PriceType', sql.Int, dto.priceType)
      .input('PriceValue', sql.Float, dto.priceValue)
      .execute('CreateUserPricing');
  }

  /**
   * Fetch custom pricing rules for a reseller
   */
  async getPricing(userId: number): Promise<UserPricing[]> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('UserId', sql.Decimal(18, 0), userId)
      .query('SELECT Id, UserId, PriceType, PriceValue FROM UserPricing WHERE UserId = @UserId');

    return result.recordset.map((row) => ({
      id: row.Id,
      userId: Number(row.UserId),
      priceType: row.PriceType,
      priceValue: row.PriceValue,
    }));
  }

  /**
   * Fetch sub-clients registered under this reseller (where ParentId = ResellerId)
   */
  async getSubClients(resellerId: number) {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('ParentId', sql.Decimal(18, 0), resellerId)
      .query(`
        SELECT Id, Name, Email, Phone, Country, Organisation, Status, Created
        FROM Users
        WHERE ParentId = @ParentId AND Deleted = 0
        ORDER BY Created DESC
      `);

    return result.recordset;
  }
}

