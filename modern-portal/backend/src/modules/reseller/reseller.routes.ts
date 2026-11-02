import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { requireRole, UserRole } from '../../common/middleware/role.middleware.js';
import {
  addFundsToWallet,
  createSubClient,
  getPricingRules,
  getResellerSubClients,
  getResellerWallet,
  updatePricingRule,
} from './reseller.controller.js';

export const resellerRouter = Router();

// Only Reseller (roleId = 3) or Admin (roleId = 1) can access reseller routes
resellerRouter.use(requireAuth);
resellerRouter.use(requireRole([UserRole.RESELLER, UserRole.ADMIN]));

resellerRouter.get('/clients', getResellerSubClients);
resellerRouter.post('/clients', createSubClient);
resellerRouter.get('/pricing', getPricingRules);
resellerRouter.post('/pricing', updatePricingRule);
resellerRouter.get('/wallet', getResellerWallet);
resellerRouter.post('/wallet/deposit', addFundsToWallet);

