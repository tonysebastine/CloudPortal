import { Request, Response } from 'express';
import { sqlite } from '../../common/database/sqlite.js';
import { config } from '../../config/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user: any = sqlite
      .prepare('SELECT * FROM Users WHERE Email = ? AND Deleted = 0')
      .get(email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let isValid = false;
    if (user.Password.startsWith('$2a$') || user.Password.startsWith('$2b$')) {
      isValid = await bcrypt.compare(password, user.Password);
    } else {
      isValid = user.Password === password;
    }

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.Id, email: user.Email, roleId: user.RoleId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.Id,
        name: user.Name,
        email: user.Email,
        roleId: user.RoleId,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password, phone, country } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing: any = sqlite
      .prepare('SELECT Id FROM Users WHERE Email = ?')
      .get(email);

    if (existing) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO Users (RoleId, Name, Email, Password, Phone, Country, Status, Created, Deleted)
      VALUES (2, ?, ?, ?, ?, ?, 1, ?, 0)
    `).run(name, email, hashedPassword, phone || '', country || '', now);

    return res.status(201).json({ message: 'User registered successfully' });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
}
