const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './data/products.db';
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created database directory: ${dbDir}`);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeTables();
    }
});

function initializeTables() {
    // Products table
    db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shopify_id TEXT UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      vendor TEXT,
      product_type TEXT,
      handle TEXT,
      status TEXT DEFAULT 'active',
      tags TEXT,
      price DECIMAL(10,2),
      compare_at_price DECIMAL(10,2),
      sku TEXT,
      barcode TEXT,
      inventory_quantity INTEGER DEFAULT 0,
      weight DECIMAL(8,2),
      weight_unit TEXT DEFAULT 'kg',
      requires_shipping BOOLEAN DEFAULT 1,
      taxable BOOLEAN DEFAULT 1,
      images TEXT, -- JSON string of image URLs
      variants TEXT, -- JSON string of variants
      options TEXT, -- JSON string of product options
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME
    )
  `);

    // Orders table
    db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shopify_id TEXT UNIQUE,
      order_number TEXT,
      email TEXT,
      phone TEXT,
      customer_name TEXT,
      shipping_address TEXT, -- JSON string
      billing_address TEXT, -- JSON string
      line_items TEXT, -- JSON string of order items
      subtotal_price DECIMAL(10,2),
      total_tax DECIMAL(10,2),
      total_price DECIMAL(10,2),
      currency TEXT DEFAULT 'USD',
      financial_status TEXT,
      fulfillment_status TEXT,
      order_status TEXT DEFAULT 'open',
      processed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME
    )
  `);

    // Sync logs table
    db.run(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL, -- 'products', 'orders', 'full'
      status TEXT NOT NULL, -- 'started', 'completed', 'failed'
      records_processed INTEGER DEFAULT 0,
      records_created INTEGER DEFAULT 0,
      records_updated INTEGER DEFAULT 0,
      error_message TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `);

    console.log('Database tables initialized');
}

module.exports = db;