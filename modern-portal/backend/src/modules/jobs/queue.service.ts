import { Queue, Worker } from 'bullmq';
import { sendEmail } from './email.service.js';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null,
};

let notificationQueue: Queue | null = null;

export function getNotificationQueue(): Queue | null {
  if (process.env.REDIS_ENABLED === 'true' && !notificationQueue) {
    notificationQueue = new Queue('portal-notifications', {
      connection: redisConnection,
    });
  }
  return notificationQueue;
}

export function startJobWorkers() {
  if (process.env.REDIS_ENABLED !== 'true') {
    return;
  }
  try {
    const worker = new Worker(
    'portal-notifications',
    async (job) => {
      console.log(`Processing background job: ${job.name} (ID: ${job.id})`);
      if (job.name === 'invoice-reminder') {
        const { email, invoiceId, amount, dueDate } = job.data;
        await sendEmail(
          email,
          `Payment Reminder: Invoice #${invoiceId}`,
          `<h3>Invoice Payment Reminder</h3><p>Your invoice <strong>#${invoiceId}</strong> for <strong>${amount}</strong> is due on <strong>${dueDate}</strong>.</p>`
        );
      } else if (job.name === 'domain-expiry-alert') {
        const { email, domain, expiryDate } = job.data;
        await sendEmail(
          email,
          `Urgent: Domain ${domain} Expiration Notice`,
          `<h3>Domain Renewal Notice</h3><p>Your domain <strong>${domain}</strong> will expire on <strong>${expiryDate}</strong>. Please renew immediately to avoid suspension.</p>`
        );
      }
    },
    { connection: redisConnection }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error:`, err);
  });
  } catch (err) {
    console.warn('⚠️ BullMQ worker initialization skipped:', err);
  }
}

