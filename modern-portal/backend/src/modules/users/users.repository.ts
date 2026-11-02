import { getDbPool, sql } from '../../common/database/db.js';
import { CreateUserDto, User } from './users.model.js';
import bcrypt from 'bcryptjs';

export class UsersRepository {
  /**
   * Creates a user by invoking the legacy 'CreateUsers' stored procedure
   */
  async createUser(dto: CreateUserDto): Promise<string> {
    const pool = await getDbPool();
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const now = new Date().toISOString();

    const result = await pool
      .request()
      .input('RoleId', sql.Int, dto.roleId || 2)
      .input('ReferenceNo', sql.VarChar, dto.referenceNo || '')
      .input('Reference', sql.Decimal(18, 2), dto.reference || 0)
      .input('Name', sql.NVarChar, dto.name)
      .input('Email', sql.VarChar, dto.email)
      .input('Password', sql.NVarChar, hashedPassword)
      .input('Phone', sql.VarChar, dto.phone || '')
      .input('Address', sql.VarChar, dto.address || '')
      .input('Street', sql.NVarChar, dto.street || '')
      .input('StreetOne', sql.NVarChar, '')
      .input('POBox', sql.VarChar, '')
      .input('City', sql.NVarChar, dto.city || '')
      .input('Country', sql.VarChar, dto.country || '')
      .input('Organisation', sql.NVarChar, dto.organisation || '')
      .input('IP', sql.VarChar, '')
      .input('ImagePath', sql.VarChar, '')
      .input('Fax', sql.VarChar, '')
      .input('ParentId', sql.Decimal(18, 2), 0)
      .input('Status', sql.Bit, true)
      .input('Created', sql.VarChar, now)
      .input('Modified', sql.VarChar, now)
      .input('Deleted', sql.Bit, false)
      .input('AltEmail', sql.VarChar, '')
      .input('SpecialPrice', sql.Bit, false)
      .input('GSTIN', sql.VarChar, dto.gstin || '')
      .input('State', sql.VarChar, dto.state || '')
      .input('StateCode', sql.Int, dto.stateCode || 0)
      .input('International', sql.Bit, false)
      .execute('CreateUsers');

    return result.returnValue ? String(result.returnValue) : 'SUCCESS';
  }

  async findByEmail(email: string): Promise<User | null> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('Email', sql.VarChar, email)
      .query('SELECT TOP 1 * FROM Users WHERE Email = @Email AND Deleted = 0');

    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
    return {
      id: row.Id,
      roleId: row.RoleId,
      name: row.Name,
      email: row.Email,
      password: row.Password,
      phone: row.Phone,
      address: row.Address,
      city: row.City,
      country: row.Country,
      organisation: row.Organisation,
      status: row.Status,
      deleted: row.Deleted,
      gstin: row.GSTIN,
      state: row.State,
    };
  }

  async findById(id: number): Promise<User | null> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('Id', sql.Int, id)
      .query('SELECT TOP 1 * FROM Users WHERE Id = @Id AND Deleted = 0');

    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
    return {
      id: row.Id,
      roleId: row.RoleId,
      name: row.Name,
      email: row.Email,
      phone: row.Phone,
      address: row.Address,
      city: row.City,
      country: row.Country,
      organisation: row.Organisation,
      status: row.Status,
      deleted: row.Deleted,
      gstin: row.GSTIN,
      state: row.State,
    };
  }
}

