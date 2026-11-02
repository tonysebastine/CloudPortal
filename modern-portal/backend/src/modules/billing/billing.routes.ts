import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import {
  createInvoice,
  getInvoiceDetails,
  listMyInvoices,
  payInvoice,
} from './billing.controller.js';

export const billingRouter = Router();

// Protect all billing routes
billingRouter.use(requireAuth);

billingRouter.get('/invoices', listMyInvoices);
billingRouter.post('/invoices', createInvoice);
billingRouter.get('/invoices/:id', getInvoiceDetails);
billingRouter.post('/invoices/:id/pay', payInvoice);

