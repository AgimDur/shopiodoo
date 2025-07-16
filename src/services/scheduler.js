const cron = require('node-cron');
const SyncService = require('./sync');

class SchedulerService {
  constructor() {
    this.syncService = new SyncService();
    this.jobs = new Map();
  }

  start() {
    // Sync products every 2 hours (more frequent)
    const productSyncJob = cron.schedule('0 */2 * * *', async () => {
      console.log('🔄 Starting scheduled product sync...');
      try {
        const result = await this.syncService.syncProducts();
        console.log('✅ Scheduled product sync completed:', result);
      } catch (error) {
        console.error('❌ Scheduled product sync failed:', error.message);
      }
    }, { scheduled: false });

    // Sync orders every 15 minutes (more frequent for orders)
    const orderSyncJob = cron.schedule('*/15 * * * *', async () => {
      console.log('🔄 Starting scheduled order sync...');
      try {
        const result = await this.syncService.syncOrders();
        console.log('✅ Scheduled order sync completed:', result);
      } catch (error) {
        console.error('❌ Scheduled order sync failed:', error.message);
      }
    }, { scheduled: false });

    // Full sync once daily at 2 AM
    const dailySyncJob = cron.schedule('0 2 * * *', async () => {
      console.log('🚀 Starting daily full sync...');
      try {
        const productsResult = await this.syncService.syncProducts();
        const ordersResult = await this.syncService.syncOrders();
        console.log('✅ Daily full sync completed:', { 
          products: productsResult, 
          orders: ordersResult 
        });
      } catch (error) {
        console.error('❌ Daily full sync failed:', error.message);
      }
    }, { scheduled: false });

    this.jobs.set('products', productSyncJob);
    this.jobs.set('orders', orderSyncJob);
    this.jobs.set('daily', dailySyncJob);

    // Always start jobs in production (Railway sets NODE_ENV=production)
    if (process.env.NODE_ENV === 'production') {
      productSyncJob.start();
      orderSyncJob.start();
      dailySyncJob.start();
      console.log('🚀 Automatic sync jobs started:');
      console.log('   📦 Products: Every 2 hours');
      console.log('   📋 Orders: Every 15 minutes');
      console.log('   🔄 Full sync: Daily at 2 AM');
    } else {
      console.log('⚠️  Automatic sync disabled in development mode');
      console.log('   Use manual sync buttons in dashboard');
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