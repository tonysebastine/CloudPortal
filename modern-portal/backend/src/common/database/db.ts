import sql from 'mssql';
import { config } from '../../config/index.js';

let pool: sql.ConnectionPool | null = null;

export async function getDbPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  try {
    pool = await new sql.ConnectionPool(config.db).connect();
    console.log('✅ Connected to SQL Server database');
    return pool;
  } catch (err) {
    console.error('❌ Failed to connect to SQL Server:', err);
    throw err;
  }
}

export { sql };

