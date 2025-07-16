const ShopifyService = require('../src/services/shopify');
require('dotenv').config();

async function setupWebhooks() {
  try {
    const shopify = new ShopifyService();
    const baseUrl = process.env.WEBHOOK_BASE_URL || 'https://your-domain.com';
    
    const webhooks = [
      {
        topic: 'products/create',
        address: `${baseUrl}/api/webhooks/products`
      },
      {
        topic: 'products/update',
        address: `${baseUrl}/api/webhooks/products`
      },
      {
        topic: 'orders/create',
        address: `${baseUrl}/api/webhooks/orders`
      },
      {
        topic: 'orders/updated',
        address: `${baseUrl}/api/webhooks/orders`
      },
      {
        topic: 'orders/paid',
        address: `${baseUrl}/api/webhooks/orders`
      },
      {
        topic: 'orders/cancelled',
        address: `${baseUrl}/api/webhooks/orders`
      }
    ];

    console.log('Setting up Shopify webhooks...');
    
    // Get existing webhooks
    const existingWebhooks = await shopify.getWebhooks();
    console.log(`Found ${existingWebhooks.length} existing webhooks`);

    for (const webhook of webhooks) {
      // Check if webhook already exists
      const exists = existingWebhooks.find(w => 
        w.topic === webhook.topic && w.address === webhook.address
      );

      if (exists) {
        console.log(`✓ Webhook already exists: ${webhook.topic}`);
      } else {
        try {
          await shopify.createWebhook(webhook.topic, webhook.address);
          console.log(`✓ Created webhook: ${webhook.topic}`);
        } catch (error) {
          console.error(`✗ Failed to create webhook ${webhook.topic}:`, error.message);
        }
      }
    }

    console.log('Webhook setup completed');
  } catch (error) {
    console.error('Error setting up webhooks:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupWebhooks();
}

module.exports = setupWebhooks;