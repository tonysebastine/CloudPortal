import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { ticketsRouter } from './modules/tickets/tickets.routes.js';
import { billingRouter } from './modules/billing/billing.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { resellerRouter } from './modules/reseller/reseller.routes.js';
import { domainsRouter } from './modules/domains/domains.routes.js';
import { provisioningRouter } from './modules/provisioning/provisioning.routes.js';
import { startJobWorkers } from './modules/jobs/queue.service.js';
import { initLocalDevDb } from './common/database/sqlite.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route dispatchers
app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reseller', resellerRouter);
app.use('/api/domains', domainsRouter);
app.use('/api/provisioning', provisioningRouter);

// Start background task workers if Redis is enabled
if (process.env.REDIS_ENABLED === 'true') {
  try {
    startJobWorkers();
    console.log('🔄 Background BullMQ job workers started');
  } catch (err) {
    console.warn('⚠️ Redis not available, running without background worker:', err);
  }
}

// Initialize database & start server
async function bootstrap() {
  await initLocalDevDb();

  app.listen(config.port, () => {
    console.log(`🚀 Modern Portal API running on http://localhost:${config.port}`);
  });
}

bootstrap().catch(console.error);
