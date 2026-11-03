import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { requireRole, UserRole } from '../../common/middleware/role.middleware.js';
import {
  createOrUpdateTLD,
  deleteTLD,
  getDashboardOverview,
  getInfrastructureHealth,
  getPlatformLedger,
  getUpstreamStatus,
  listAllTLDs,
  listAllUsers,
  triggerUpstreamSync,
  updateUserKYC,
  updateUserStatus,
} from './admin.controller.js';

export const adminRouter = Router();

// Only Admin (roleId = 1) can access admin routes
adminRouter.use(requireAuth);
adminRouter.use(requireRole([UserRole.ADMIN]));

adminRouter.get('/overview', getDashboardOverview);
adminRouter.get('/users', listAllUsers);
adminRouter.patch('/users/:id/status', updateUserStatus);
adminRouter.patch('/users/:id/kyc', updateUserKYC);

// TLD & Pricing Admin Control Endpoints
adminRouter.get('/tlds', listAllTLDs);
adminRouter.post('/tlds', createOrUpdateTLD);
adminRouter.delete('/tlds/:id', deleteTLD);

// Upstream W3Infotech Reseller Bridge Status & Live Sync
adminRouter.get('/upstream/status', getUpstreamStatus);
adminRouter.post('/upstream/sync', triggerUpstreamSync);

// Infrastructure Health Monitoring
adminRouter.get('/infrastructure/health', getInfrastructureHealth);

// Master Platform Transaction Ledger
adminRouter.get('/ledger', getPlatformLedger);

