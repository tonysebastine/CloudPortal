export interface ProxmoxConfig {
  host: string;
  port?: number;
  tokenId: string; // e.g. root@pam!portal-token
  tokenSecret: string;
  node?: string; // Proxmox cluster node, default 'pve'
}

export interface ProxmoxCreateVmDto {
  vmid: number;
  name: string;
  cores?: number;
  memoryMB?: number; // RAM in MB
  diskGB?: number;
  node?: string;
  templateVmId?: number; // Clone from existing template
}

export class ProxmoxService {
  constructor(private config: ProxmoxConfig) {}

  private getBaseUrl(): string {
    const port = this.config.port || 8006;
    return `https://${this.config.host}:${port}/api2/json`;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `PVEAPIToken=${this.config.tokenId}=${this.config.tokenSecret}`,
    };
  }

  /**
   * Get cluster nodes and health
   */
  async getNodes(): Promise<any> {
    const res = await fetch(`${this.getBaseUrl()}/nodes`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Proxmox API request failed: ${res.statusText}`);
    return res.json();
  }

  /**
   * Clone a VM from an existing gold template (Fastest VPS Provisioning)
   */
  async cloneVm(dto: ProxmoxCreateVmDto): Promise<any> {
    const node = dto.node || this.config.node || 'pve';
    const templateId = dto.templateVmId || 9000;

    const payload: Record<string, any> = {
      newid: dto.vmid,
      name: dto.name,
      full: 1, // Full clone
    };

    const res = await fetch(`${this.getBaseUrl()}/nodes/${node}/qemu/${templateId}/clone`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Proxmox VM clone failed: ${err.message || res.statusText}`);
    }

    return res.json();
  }

  /**
   * Power control for VPS: start | stop | reboot | shutdown
   */
  async powerControl(vmid: number, action: 'start' | 'stop' | 'reboot' | 'shutdown', node?: string): Promise<any> {
    const targetNode = node || this.config.node || 'pve';
    const res = await fetch(`${this.getBaseUrl()}/nodes/${targetNode}/qemu/${vmid}/status/${action}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Proxmox VM ${action} failed: ${res.statusText}`);
    }

    return res.json();
  }
}

