export interface PleskConfig {
  host: string;
  port?: number;
  apiKey?: string;
  username?: string;
  password?: string;
}

export interface PleskCreateWebspaceDto {
  name: string; // domain name, e.g. domain.com
  ipv4?: string;
  login: string;
  password: string;
  planName?: string;
}

export class PleskService {
  constructor(private config: PleskConfig) {}

  private getBaseUrl(): string {
    const port = this.config.port || 8443;
    return `https://${this.config.host}:${port}/api/v2`;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    } else if (this.config.username && this.config.password) {
      const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    return headers;
  }

  /**
   * Ping / Check Server Status
   */
  async checkStatus(): Promise<any> {
    const res = await fetch(`${this.getBaseUrl()}/server`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Plesk API status failed: ${res.statusText}`);
    return res.json();
  }

  /**
   * Provision a new Webspace / Subscription in Plesk
   */
  async createSubscription(dto: PleskCreateWebspaceDto): Promise<any> {
    const payload = {
      name: dto.name,
      hosting_type: 'virtual',
      hosting_settings: {
        ftp_login: dto.login,
        ftp_password: dto.password,
      },
      plan: {
        name: dto.planName || 'Default Web Hosting',
      },
      ...(dto.ipv4 ? { ipv4: dto.ipv4 } : {}),
    };

    const res = await fetch(`${this.getBaseUrl()}/domains`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`Plesk provision domain failed: ${errData.message || res.statusText}`);
    }

    return res.json();
  }

  /**
   * Suspend or Activate a domain in Plesk
   */
  async setDomainStatus(domainId: string | number, status: 'active' | 'suspended'): Promise<void> {
    const res = await fetch(`${this.getBaseUrl()}/domains/${domainId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error(`Plesk update status failed: ${res.statusText}`);
  }
}

