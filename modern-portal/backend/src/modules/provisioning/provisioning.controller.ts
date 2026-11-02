import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';
import { PleskService } from './integrations/plesk.service.js';
import { CPanelService } from './integrations/cpanel.service.js';
import { SmarterMailService } from './integrations/smartermail.service.js';
import { ProxmoxService } from './integrations/proxmox.service.js';

// Instantiate services with environment configs or fallbacks
const plesk = new PleskService({
  host: process.env.PLESK_HOST || 'plesk.example.com',
  apiKey: process.env.PLESK_API_KEY,
  username: process.env.PLESK_USER,
  password: process.env.PLESK_PASSWORD,
});

const cpanel = new CPanelService({
  host: process.env.CPANEL_HOST || 'cpanel.example.com',
  username: process.env.CPANEL_USER || 'root',
  apiToken: process.env.CPANEL_API_TOKEN || '',
});

const smartermail = new SmarterMailService({
  host: process.env.SMARTERMAIL_HOST || 'mail.example.com',
  apiToken: process.env.SMARTERMAIL_API_TOKEN || '',
});

const proxmox = new ProxmoxService({
  host: process.env.PROXMOX_HOST || 'pve.example.com',
  tokenId: process.env.PROXMOX_TOKEN_ID || '',
  tokenSecret: process.env.PROXMOX_TOKEN_SECRET || '',
});

/**
 * Provision Web Hosting (Plesk or cPanel)
 */
export async function provisionWebHosting(req: AuthenticatedRequest, res: Response) {
  try {
    const { platform, domain, username, password, plan } = req.body;

    if (!platform || !domain || !username) {
      return res.status(400).json({ message: 'platform (plesk|cpanel), domain, and username are required' });
    }

    if (platform.toLowerCase() === 'plesk') {
      const result = await plesk.createSubscription({
        name: domain,
        login: username,
        password: password || 'Default#Pass123',
        planName: plan,
      });
      return res.status(201).json({ message: 'Plesk hosting subscription created', result });
    } else if (platform.toLowerCase() === 'cpanel') {
      const result = await cpanel.createAccount({
        domain,
        username,
        password,
        plan,
      });
      return res.status(201).json({ message: 'cPanel account provisioned', result });
    } else {
      return res.status(400).json({ message: 'Invalid platform. Must be plesk or cpanel.' });
    }
  } catch (err: any) {
    console.error('Hosting provision error:', err);
    return res.status(500).json({ message: 'Failed to provision hosting account', error: err.message });
  }
}

/**
 * Provision SmarterMail Domain / Mailbox
 */
export async function provisionMail(req: AuthenticatedRequest, res: Response) {
  try {
    const { action, domain, username, password, maxUsers } = req.body;

    if (action === 'create-domain') {
      if (!domain) return res.status(400).json({ message: 'domain is required' });
      const result = await smartermail.addDomain({ name: domain, maxUsers });
      return res.status(201).json({ message: 'SmarterMail domain configured', result });
    } else if (action === 'create-user') {
      if (!domain || !username || !password) {
        return res.status(400).json({ message: 'domain, username, and password are required' });
      }
      const result = await smartermail.createUserMailbox({ domain, username, password });
      return res.status(201).json({ message: 'SmarterMail user mailbox created', result });
    } else {
      return res.status(400).json({ message: 'Invalid action. Choose create-domain or create-user.' });
    }
  } catch (err: any) {
    console.error('SmarterMail error:', err);
    return res.status(500).json({ message: 'Failed to configure SmarterMail', error: err.message });
  }
}

/**
 * Provision & Manage Proxmox VPS
 */
export async function provisionVps(req: AuthenticatedRequest, res: Response) {
  try {
    const { vmid, name, templateVmId } = req.body;
    if (!vmid || !name) {
      return res.status(400).json({ message: 'vmid and name are required' });
    }

    const result = await proxmox.cloneVm({ vmid: Number(vmid), name, templateVmId });
    return res.status(201).json({ message: 'Proxmox VPS clone and setup initiated', result });
  } catch (err: any) {
    console.error('Proxmox VPS error:', err);
    return res.status(500).json({ message: 'Failed to provision Proxmox VPS', error: err.message });
  }
}

export async function controlVpsPower(req: AuthenticatedRequest, res: Response) {
  try {
    const vmid = parseInt(req.params.vmid, 10);
    const { action } = req.body; // 'start' | 'stop' | 'reboot' | 'shutdown'

    if (!['start', 'stop', 'reboot', 'shutdown'].includes(action)) {
      return res.status(400).json({ message: 'Action must be start, stop, reboot, or shutdown' });
    }

    const result = await proxmox.powerControl(vmid, action);
    return res.json({ message: `Proxmox VPS ${action} command sent`, result });
  } catch (err: any) {
    console.error('Proxmox power control error:', err);
    return res.status(500).json({ message: 'Failed to send power command', error: err.message });
  }
}

