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

module.exports = router;