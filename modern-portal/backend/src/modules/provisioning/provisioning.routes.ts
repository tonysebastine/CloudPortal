import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { requireRole, UserRole } from '../../common/middleware/role.middleware.js';
import {
  controlVpsPower,
  provisionMail,
  provisionVps,
  provisionWebHosting,
} from './provisioning.controller.js';

export const provisioningRouter = Router();

// Provisioning operations are restricted to Admins and Resellers
provisioningRouter.use(requireAuth);
provisioningRouter.use(requireRole([UserRole.ADMIN, UserRole.RESELLER]));

// Web Hosting (Plesk & cPanel)
provisioningRouter.post('/hosting', provisionWebHosting);

// Email (SmarterMail)
provisioningRouter.post('/email', provisionMail);

// VPS / Virtualization (Proxmox)
provisioningRouter.post('/vps/clone', provisionVps);
provisioningRouter.post('/vps/:vmid/power', controlVpsPower);

