export interface CPanelConfig {
  host: string;
  port?: number;
  apiToken: string;
  username: string;
}

export interface CPanelCreateAccountDto {
  username: string;
  domain: string;
  password?: string;
  plan?: string;
  contactEmail?: string;
}

export class CPanelService {
  constructor(private config: CPanelConfig) {}

  private getBaseUrl(): string {
    const port = this.config.port || 2087; // WHM default secure port
    return `https://${this.config.host}:${port}/json-api`;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `whm ${this.config.username}:${this.config.apiToken}`,
    };
  }

  /**
   * Provision a new cPanel user account via WHM JSON API
   */
  async createAccount(dto: CPanelCreateAccountDto): Promise<any> {
    const params = new URLSearchParams({
      'api.version': '1',
      username: dto.username,
      domain: dto.domain,
      plan: dto.plan || 'default',
      ...(dto.password ? { password: dto.password } : {}),
      ...(dto.contactEmail ? { contactemail: dto.contactEmail } : {}),
    });

    const res = await fetch(`${this.getBaseUrl()}/createacct?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (data.metadata?.result === 0) {
      throw new Error(`cPanel account creation failed: ${data.metadata.reason}`);
    }

    return data;
  }

  /**
   * Suspend a cPanel account
   */
  async suspendAccount(user: string, reason: string = 'Billing non-payment'): Promise<any> {
    const params = new URLSearchParams({
      'api.version': '1',
      user,
      reason,
    });

    const res = await fetch(`${this.getBaseUrl()}/suspendacct?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  /**
   * Unsuspend a cPanel account
   */
  async unsuspendAccount(user: string): Promise<any> {
    const params = new URLSearchParams({
      'api.version': '1',
      user,
    });

    const res = await fetch(`${this.getBaseUrl()}/unsuspendacct?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return res.json();
  }
}

