const express = require('express');
const db = require('../database/db');
const SyncService = require('../services/sync');
const router = express.Router();

const syncService = new SyncService();

// Sync products from Shopify
router.post('/products', async (req, res) => {
  try {
    const result = await syncService.syncProducts();
    res.json({
      success: true,
      message: 'Products sync completed',
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sync orders from Shopify
router.post('/orders', async (req, res) => {
  try {
    const result = await syncService.syncOrders();
    res.json({
      success: true,
      message: 'Orders sync completed',
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Full sync (products and orders)
router.post('/full', async (req, res) => {
  try {
    const productsResult = await syncService.syncProducts();
    const ordersResult = await syncService.syncOrders();
    
    res.json({
      success: true,
      message: 'Full sync completed',
      products: productsResult,
      orders: ordersResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get sync history
router.get('/history', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const query = `
    SELECT * FROM sync_logs 
    ORDER BY started_at DESC 
    LIMIT ? OFFSET ?
  `;

  const countQuery = 'SELECT COUNT(*) as total FROM sync_logs';

  db.get(countQuery, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.all(query, [limit, offset], (err, logs) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        logs,
        pagination: {
          page,
          limit,
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

// Get sync status
router.get('/status', (req, res) => {
  const query = `
    SELECT 
      sync_type,
      status,
      started_at,
      completed_at,
      records_processed,
      records_created,
      records_updated,
      error_message
    FROM sync_logs 
    WHERE id IN (
      SELECT MAX(id) 
      FROM sync_logs 
      GROUP BY sync_type
    )
    ORDER BY started_at DESC
  `;

  db.all(query, (err, logs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ syncStatus: logs });
  });
});

// Get scheduler status
router.get('/scheduler/status', (req, res) => {
  // This would need to be implemented with access to the scheduler instance
  // For now, return basic info
  res.json({
    enabled: process.env.NODE_ENV === 'production',
    environment: process.env.NODE_ENV,
    schedules: {
      products: 'Every 2 hours',
      orders: 'Every 15 minutes', 
      daily: 'Daily at 2 AM'
    },
    nextRuns: {
      products: 'Next even hour (00:00, 02:00, 04:00, etc.)',
      orders: 'Every 15 minutes (:00, :15, :30, :45)',
      daily: 'Tomorrow at 2:00 AM'
    }
  });
});

// Setup webhooks automatically
router.post('/webhooks/setup', async (req, res) => {
  try {
    const setupWebhooks = require('../../scripts/setup-webhooks');
    await setupWebhooks();
    res.json({
      success: true,
      message: 'Webhooks successfully configured',
      webhooks: [
        'products/create',
        'products/update', 
        'orders/create',
        'orders/updated',
        'orders/paid',
        'orders/cancelled'
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      instructions: {
        manual_setup: 'Go to Shopify Admin → Settings → Notifications → Webhooks',
        urls: {
          products: `${req.protocol}://${req.get('host')}/api/webhooks/products`,
          orders: `${req.protocol}://${req.get('host')}/api/webhooks/orders`
        }
      }
    });
  }
});

module.exports = router;