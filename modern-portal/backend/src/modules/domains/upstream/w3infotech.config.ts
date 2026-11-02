export interface W3ResellerConfig {
  baseUrl: string;
  username: string;
  password?: string;
  timeoutMs?: number;
}

export const w3ResellerConfig: W3ResellerConfig = {
  baseUrl: process.env.W3_PORTAL_URL || 'https://w3infotech.com',
  username: process.env.W3_RESELLER_USER || 'reseller@w3infotech.com',
  password: process.env.W3_RESELLER_PASSWORD || '',
  timeoutMs: 15000,
};

