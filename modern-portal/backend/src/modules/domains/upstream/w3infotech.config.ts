import dotenv from 'dotenv';
dotenv.config();

export interface W3ResellerConfig {
  baseUrl: string;
  username: string;
  password?: string;
  initialBalance?: number;
  timeoutMs?: number;
}

export function getW3ResellerConfig(): W3ResellerConfig {
  return {
    baseUrl: process.env.W3_PORTAL_URL || 'https://w3infotech.com',
    username: process.env.W3_RESELLER_USER || '',
    password: process.env.W3_RESELLER_PASSWORD || '',
    initialBalance: parseFloat(process.env.W3_RESELLER_CREDIT_BALANCE || '0') || 0,
    timeoutMs: 15000,
  };
}

