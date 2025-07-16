const db = require('../database/db');
const ShopifyService = require('./shopify');

class SyncService {
  constructor() {
    this.shopify = new ShopifyService();
  }

  async syncProducts() {
    const syncId = await this.startSync('products');
    let processed = 0, created = 0, updated = 0;

    try {
      let sinceId = null;
      let hasMore = true;

      while (hasMore) {
        const products = await this.shopify.getProducts(250, sinceId);
        
        if (products.length === 0) {
          hasMore = false;
          break;
        }

        for (const product of products) {
          try {
            const result = await this.saveProduct(product);
            processed++;
            if (result.created) created++;
            else updated++;
          } catch (error) {
            console.error(`Error saving product ${product.id}:`, error.message);
          }
        }

        sinceId = products[products.length - 1].id;
        hasMore = products.length === 250;
      }

      await this.completeSync(syncId, processed, created, updated);
      return { processed, created, updated };
    } catch (error) {
      await this.failSync(syncId, error.message);
      throw error;
    }
  }

  async syncOrders() {
    const syncId = await this.startSync('orders');
    let processed = 0, created = 0, updated = 0;

    try {
      let sinceId = null;
      let hasMore = true;

      while (hasMore) {
        const orders = await this.shopify.getOrders(250, sinceId);
        
        if (orders.length === 0) {
          hasMore = false;
          break;
        }

        for (const order of orders) {
          try {
            const result = await this.saveOrder(order);
            processed++;
            if (result.created) created++;
            else updated++;
          } catch (error) {
            console.error(`Error saving order ${order.id}:`, error.message);
          }
        }

        sinceId = orders[orders.length - 1].id;
        hasMore = orders.length === 250;
      }

      await this.completeSync(syncId, processed, created, updated);
      return { processed, created, updated };
    } catch (error) {
      await this.failSync(syncId, error.message);
      throw error;
    }
  }

  async saveProduct(shopifyProduct) {
    return new Promise((resolve, reject) => {
      const variant = shopifyProduct.variants[0] || {};
      
      const productData = {
        shopify_id: shopifyProduct.id.toString(),
        title: shopifyProduct.title,
        description: shopifyProduct.body_html,
        vendor: shopifyProduct.vendor,
        product_type: shopifyProduct.product_type,
        handle: shopifyProduct.handle,
        status: shopifyProduct.status,
        tags: shopifyProduct.tags,
        price: variant.price || 0,
        compare_at_price: variant.compare_at_price,
        sku: variant.sku,
        barcode: variant.barcode,
        inventory_quantity: variant.inventory_quantity || 0,
        weight: variant.weight,
        weight_unit: variant.weight_unit,
        requires_shipping: variant.requires_shipping ? 1 : 0,
        taxable: variant.taxable ? 1 : 0,
        images: JSON.stringify(shopifyProduct.images || []),
        variants: JSON.stringify(shopifyProduct.variants || []),
        options: JSON.stringify(shopifyProduct.options || []),
        synced_at: new Date().toISOString()
      };

      // Check if product exists
      db.get('SELECT id FROM products WHERE shopify_id = ?', [productData.shopify_id], (err, row) => {
        if (err) return reject(err);

        if (row) {
          // Update existing product
          const updateQuery = `
            UPDATE products SET 
              title = ?, description = ?, vendor = ?, product_type = ?, handle = ?,
              status = ?, tags = ?, price = ?, compare_at_price = ?, sku = ?,
              barcode = ?, inventory_quantity = ?, weight = ?, weight_unit = ?,
              requires_shipping = ?, taxable = ?, images = ?, variants = ?, options = ?,
              updated_at = CURRENT_TIMESTAMP, synced_at = ?
            WHERE shopify_id = ?
          `;
          
          db.run(updateQuery, [
            productData.title, productData.description, productData.vendor,
            productData.product_type, productData.handle, productData.status,
            productData.tags, productData.price, productData.compare_at_price,
            productData.sku, productData.barcode, productData.inventory_quantity,
            productData.weight, productData.weight_unit, productData.requires_shipping,
            productData.taxable, productData.images, productData.variants,
            productData.options, productData.synced_at, productData.shopify_id
          ], (err) => {
            if (err) return reject(err);
            resolve({ created: false, updated: true });
          });
        } else {
          // Insert new product
          const insertQuery = `
            INSERT INTO products (
              shopify_id, title, description, vendor, product_type, handle,
              status, tags, price, compare_at_price, sku, barcode,
              inventory_quantity, weight, weight_unit, requires_shipping,
              taxable, images, variants, options, synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          db.run(insertQuery, [
            productData.shopify_id, productData.title, productData.description,
            productData.vendor, productData.product_type, productData.handle,
            productData.status, productData.tags, productData.price,
            productData.compare_at_price, productData.sku, productData.barcode,
            productData.inventory_quantity, productData.weight, productData.weight_unit,
            productData.requires_shipping, productData.taxable, productData.images,
            productData.variants, productData.options, productData.synced_at
          ], (err) => {
            if (err) return reject(err);
            resolve({ created: true, updated: false });
          });
        }
      });
    });
  }

  async saveOrder(shopifyOrder) {
    return new Promise((resolve, reject) => {
      const orderData = {
        shopify_id: shopifyOrder.id.toString(),
        order_number: shopifyOrder.order_number,
        email: shopifyOrder.email,
        phone: shopifyOrder.phone,
        customer_name: shopifyOrder.customer ? 
          `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` : null,
        shipping_address: JSON.stringify(shopifyOrder.shipping_address || {}),
        billing_address: JSON.stringify(shopifyOrder.billing_address || {}),
        line_items: JSON.stringify(shopifyOrder.line_items || []),
        subtotal_price: shopifyOrder.subtotal_price,
        total_tax: shopifyOrder.total_tax,
        total_price: shopifyOrder.total_price,
        currency: shopifyOrder.currency,
        financial_status: shopifyOrder.financial_status,
        fulfillment_status: shopifyOrder.fulfillment_status,
        order_status: shopifyOrder.cancelled_at ? 'cancelled' : 'open',
        processed_at: shopifyOrder.processed_at,
        synced_at: new Date().toISOString()
      };

      // Check if order exists
      db.get('SELECT id FROM orders WHERE shopify_id = ?', [orderData.shopify_id], (err, row) => {
        if (err) return reject(err);

        if (row) {
          // Update existing order
          const updateQuery = `
            UPDATE orders SET 
              order_number = ?, email = ?, phone = ?, customer_name = ?,
              shipping_address = ?, billing_address = ?, line_items = ?,
              subtotal_price = ?, total_tax = ?, total_price = ?, currency = ?,
              financial_status = ?, fulfillment_status = ?, order_status = ?,
              processed_at = ?, updated_at = CURRENT_TIMESTAMP, synced_at = ?
            WHERE shopify_id = ?
          `;
          
          db.run(updateQuery, [
            orderData.order_number, orderData.email, orderData.phone,
            orderData.customer_name, orderData.shipping_address, orderData.billing_address,
            orderData.line_items, orderData.subtotal_price, orderData.total_tax,
            orderData.total_price, orderData.currency, orderData.financial_status,
            orderData.fulfillment_status, orderData.order_status, orderData.processed_at,
            orderData.synced_at, orderData.shopify_id
          ], (err) => {
            if (err) return reject(err);
            resolve({ created: false, updated: true });
          });
        } else {
          // Insert new order
          const insertQuery = `
            INSERT INTO orders (
              shopify_id, order_number, email, phone, customer_name,
              shipping_address, billing_address, line_items, subtotal_price,
              total_tax, total_price, currency, financial_status,
              fulfillment_status, order_status, processed_at, synced_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          db.run(insertQuery, [
            orderData.shopify_id, orderData.order_number, orderData.email,
            orderData.phone, orderData.customer_name, orderData.shipping_address,
            orderData.billing_address, orderData.line_items, orderData.subtotal_price,
            orderData.total_tax, orderData.total_price, orderData.currency,
            orderData.financial_status, orderData.fulfillment_status,
            orderData.order_status, orderData.processed_at, orderData.synced_at
          ], (err) => {
            if (err) return reject(err);
            resolve({ created: true, updated: false });
          });
        }
      });
    });
  }

  async startSync(type) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO sync_logs (sync_type, status) VALUES (?, ?)',
        [type, 'started'],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  async completeSync(syncId, processed, created, updated) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE sync_logs SET 
         status = 'completed', 
         records_processed = ?, 
         records_created = ?, 
         records_updated = ?,
         completed_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [processed, created, updated, syncId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  async failSync(syncId, errorMessage) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE sync_logs SET 
         status = 'failed', 
         error_message = ?,
         completed_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [errorMessage, syncId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }
}

module.exports = SyncService;