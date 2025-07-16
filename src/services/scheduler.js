const cron = require('node-cron');
const SyncService = require('./sync');

class SchedulerService {
  constructor() {
    this.syncService = new SyncService();
    this.jobs = new Map();
  }

  start() {
    // Sync products every 4 hours
    const productSyncJob = cron.schedule('0 */4 * * *', async () => {
      console.log('Starting scheduled product sync...');
      try {
        const result = await this.syncService.syncProducts();
        console.log('Scheduled product sync completed:', result);
      } catch (error) {
        console.error('Scheduled product sync failed:', error.message);
      }
    }, { scheduled: false });

    // Sync orders every 30 minutes
    const orderSyncJob = cron.schedule('*/30 * * * *', async () => {
      console.log('Starting scheduled order sync...');
      try {
        const result = await this.syncService.syncOrders();
        console.log('Scheduled order sync completed:', result);
      } catch (error) {
        console.error('Scheduled order sync failed:', error.message);
      }
    }, { scheduled: false });

    this.jobs.set('products', productSyncJob);
    this.jobs.set('orders', orderSyncJob);

    // Start jobs if not in development mode
    if (process.env.NODE_ENV !== 'development') {
      productSyncJob.start();
      orderSyncJob.start();
      console.log('Scheduled sync jobs started');
    } else {
      console.log('Scheduled sync jobs disabled in development mode');
    }
  }

  stop() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`Stopped ${name} sync job`);
    });
  }

  getJobStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running,
        scheduled: job.scheduled
      };
    });
    return status;
  }
}

module.exports = SchedulerService;