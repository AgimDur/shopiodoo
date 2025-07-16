#!/usr/bin/env node

const SyncService = require('../src/services/sync');
const db = require('../src/database/db');
require('dotenv').config();

const args = process.argv.slice(2);
const command = args[0];

async function runCommand() {
  const syncService = new SyncService();

  switch (command) {
    case 'sync-products':
      console.log('Starting product sync...');
      try {
        const result = await syncService.syncProducts();
        console.log('Product sync completed:', result);
      } catch (error) {
        console.error('Product sync failed:', error.message);
        process.exit(1);
      }
      break;

    case 'sync-orders':
      console.log('Starting order sync...');
      try {
        const result = await syncService.syncOrders();
        console.log('Order sync completed:', result);
      } catch (error) {
        console.error('Order sync failed:', error.message);
        process.exit(1);
      }
      break;

    case 'sync-all':
      console.log('Starting full sync...');
      try {
        const productsResult = await syncService.syncProducts();
        const ordersResult = await syncService.syncOrders();
        console.log('Full sync completed:', { products: productsResult, orders: ordersResult });
      } catch (error) {
        console.error('Full sync failed:', error.message);
        process.exit(1);
      }
      break;

    case 'stats':
      console.log('Fetching statistics...');
      db.get('SELECT COUNT(*) as products FROM products', (err, productCount) => {
        if (err) {
          console.error('Error fetching product count:', err.message);
          return;
        }
        
        db.get('SELECT COUNT(*) as orders FROM orders', (err, orderCount) => {
          if (err) {
            console.error('Error fetching order count:', err.message);
            return;
          }

          db.get('SELECT MAX(synced_at) as last_sync FROM products', (err, lastSync) => {
            if (err) {
              console.error('Error fetching last sync:', err.message);
              return;
            }

            console.log('\n=== Database Statistics ===');
            console.log(`Products: ${productCount.products}`);
            console.log(`Orders: ${orderCount.orders}`);
            console.log(`Last Product Sync: ${lastSync.last_sync || 'Never'}`);
            console.log('===========================\n');
            
            process.exit(0);
          });
        });
      });
      return; // Don't exit immediately for async operations

    case 'export-products':
      const filename = args[1] || 'products-export.json';
      console.log(`Exporting products to ${filename}...`);
      
      db.all('SELECT * FROM products ORDER BY created_at DESC', (err, products) => {
        if (err) {
          console.error('Error fetching products:', err.message);
          process.exit(1);
        }

        const fs = require('fs');
        const parsedProducts = products.map(product => ({
          ...product,
          images: JSON.parse(product.images || '[]'),
          variants: JSON.parse(product.variants || '[]'),
          options: JSON.parse(product.options || '[]')
        }));

        fs.writeFileSync(filename, JSON.stringify(parsedProducts, null, 2));
        console.log(`Exported ${products.length} products to ${filename}`);
        process.exit(0);
      });
      return;

    case 'help':
    default:
      console.log(`
Product Management System CLI

Usage: node scripts/cli.js <command> [options]

Commands:
  sync-products     Sync all products from Shopify
  sync-orders       Sync all orders from Shopify  
  sync-all          Sync both products and orders
  stats             Show database statistics
  export-products   Export products to JSON file
  help              Show this help message

Examples:
  node scripts/cli.js sync-products
  node scripts/cli.js export-products my-products.json
  node scripts/cli.js stats
      `);
      break;
  }

  process.exit(0);
}

runCommand().catch(error => {
  console.error('CLI Error:', error.message);
  process.exit(1);
});