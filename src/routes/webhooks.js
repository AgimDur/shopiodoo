const express = require('express');
const crypto = require('crypto');
const SyncService = require('../services/sync');
const router = express.Router();

const syncService = new SyncService();

// Middleware to verify Shopify webhook
function verifyShopifyWebhook(req, res, next) {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const body = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  if (hash !== hmac) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// Product created/updated webhook
router.post('/products', verifyShopifyWebhook, async (req, res) => {
  try {
    const product = req.body;
    await syncService.saveProduct(product);
    
    console.log(`Product ${product.id} synced via webhook`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook product sync error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Order created/updated webhook
router.post('/orders', verifyShopifyWebhook, async (req, res) => {
  try {
    const order = req.body;
    await syncService.saveOrder(order);
    
    console.log(`Order ${order.id} synced via webhook`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook order sync error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Generic webhook handler for other events
router.post('/:topic', verifyShopifyWebhook, (req, res) => {
  const topic = req.params.topic;
  const data = req.body;
  
  console.log(`Received webhook for topic: ${topic}`, data.id || 'no-id');
  
  // Handle other webhook topics as needed
  // For example: inventory updates, customer updates, etc.
  
  res.status(200).json({ success: true });
});

module.exports = router;