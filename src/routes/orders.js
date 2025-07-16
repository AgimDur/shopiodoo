const express = require('express');
const db = require('../database/db');
const router = express.Router();

// Get all orders with pagination and filtering
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search;
  const status = req.query.status;
  const financialStatus = req.query.financial_status;

  let query = 'SELECT * FROM orders WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (order_number LIKE ? OR email LIKE ? OR customer_name LIKE ?)';
    countQuery += ' AND (order_number LIKE ? OR email LIKE ? OR customer_name LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (status) {
    query += ' AND order_status = ?';
    countQuery += ' AND order_status = ?';
    params.push(status);
  }

  if (financialStatus) {
    query += ' AND financial_status = ?';
    countQuery += ' AND financial_status = ?';
    params.push(financialStatus);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  // Get total count
  db.get(countQuery, params.slice(0, -2), (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get orders
    db.all(query, params, (err, orders) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Parse JSON fields
      const parsedOrders = orders.map(order => ({
        ...order,
        shipping_address: JSON.parse(order.shipping_address || '{}'),
        billing_address: JSON.parse(order.billing_address || '{}'),
        line_items: JSON.parse(order.line_items || '[]')
      }));

      res.json({
        orders: parsedOrders,
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

// Get single order
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM orders WHERE id = ? OR shopify_id = ?', [id, id], (err, order) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Parse JSON fields
    const parsedOrder = {
      ...order,
      shipping_address: JSON.parse(order.shipping_address || '{}'),
      billing_address: JSON.parse(order.billing_address || '{}'),
      line_items: JSON.parse(order.line_items || '[]')
    };

    res.json(parsedOrder);
  });
});

// Get order statistics
router.get('/stats/overview', (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM orders',
    'SELECT COUNT(*) as open FROM orders WHERE order_status = "open"',
    'SELECT COUNT(*) as cancelled FROM orders WHERE order_status = "cancelled"',
    'SELECT SUM(total_price) as total_revenue FROM orders WHERE order_status != "cancelled"',
    'SELECT AVG(total_price) as avg_order_value FROM orders WHERE order_status != "cancelled"',
    `SELECT 
       DATE(created_at) as date, 
       COUNT(*) as orders, 
       SUM(total_price) as revenue 
     FROM orders 
     WHERE created_at >= date('now', '-30 days') 
     GROUP BY DATE(created_at) 
     ORDER BY date DESC`
  ];

  Promise.all(queries.map(query => 
    new Promise((resolve, reject) => {
      if (query.includes('GROUP BY')) {
        db.all(query, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        db.get(query, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }
    })
  )).then(results => {
    res.json({
      total: results[0].total,
      open: results[1].open,
      cancelled: results[2].cancelled,
      totalRevenue: results[3].total_revenue || 0,
      avgOrderValue: results[4].avg_order_value || 0,
      dailyStats: results[5]
    });
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
});

module.exports = router;