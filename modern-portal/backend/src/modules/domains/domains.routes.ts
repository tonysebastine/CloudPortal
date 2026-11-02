import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import {
  checkDomainAvailability,
  getNameservers,
  listMyDomains,
  registerDomain,
  renewDomain,
  transferDomain,
  updateNameservers,
} from './domains.controller.js';

export const domainsRouter = Router();

// Public domain check (no auth required for domain searches)
domainsRouter.get('/check', checkDomainAvailability);

// Authenticated domain operations
domainsRouter.get('/', requireAuth, listMyDomains);
domainsRouter.post('/register', requireAuth, registerDomain);
domainsRouter.post('/transfer', requireAuth, transferDomain);
domainsRouter.post('/:id/renew', requireAuth, renewDomain);
domainsRouter.get('/:id/nameservers', requireAuth, getNameservers);
domainsRouter.put('/:id/nameservers', requireAuth, updateNameservers);

