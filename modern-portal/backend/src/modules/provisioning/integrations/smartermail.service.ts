export interface SmarterMailConfig {
  host: string;
  port?: number;
  apiToken: string; // or System Admin bearer token
}

export interface SmarterMailCreateDomainDto {
  name: string; // domain.com
  maxUsers?: number;
  maxMailboxSizeMB?: number;
}

export interface SmarterMailCreateUserDto {
  domain: string;
  username: string; // e.g. info
  password: string;
  fullName?: string;
  maxMailboxSizeMB?: number;
}

export class SmarterMailService {
  constructor(private config: SmarterMailConfig) {}

  private getBaseUrl(): string {
    const port = this.config.port || 9998;
    return `https://${this.config.host}:${port}/api/v1`;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.config.apiToken}`,
    };
  }

  /**
   * Add a new mail domain to SmarterMail server
   */
  async addDomain(dto: SmarterMailCreateDomainDto): Promise<any> {
    const payload = {
      domainName: dto.name,
      userLimit: dto.maxUsers || 10,
      mailboxLimit: dto.maxMailboxSizeMB || 1024,
    };

    const res = await fetch(`${this.getBaseUrl()}/settings/domain/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`SmarterMail domain creation failed: ${err.message || res.statusText}`);
    }

    return res.json();
  }

  /**
   * Create an email account/mailbox under a domain
   */
  async createUserMailbox(dto: SmarterMailCreateUserDto): Promise<any> {
    const payload = {
      username: dto.username,
      password: dto.password,
      fullName: dto.fullName || dto.username,
      maxMailboxSize: dto.maxMailboxSizeMB || 1024,
    };

    const res = await fetch(`${this.getBaseUrl()}/settings/domain/${dto.domain}/users/create`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`SmarterMail mailbox creation failed: ${err.message || res.statusText}`);
    }

    return res.json();
  }
}

