const express = require('express');
const db = require('../database/db');
const router = express.Router();

// Get all products with pagination and filtering
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const search = req.query.search;
  const vendor = req.query.vendor;
  const status = req.query.status;

  let query = 'SELECT * FROM products WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (title LIKE ? OR description LIKE ? OR sku LIKE ?)';
    countQuery += ' AND (title LIKE ? OR description LIKE ? OR sku LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (vendor) {
    query += ' AND vendor = ?';
    countQuery += ' AND vendor = ?';
    params.push(vendor);
  }

  if (status) {
    query += ' AND status = ?';
    countQuery += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  // Get total count
  db.get(countQuery, params.slice(0, -2), (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get products
    db.all(query, params, (err, products) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Parse JSON fields
      const parsedProducts = products.map(product => ({
        ...product,
        images: JSON.parse(product.images || '[]'),
        variants: JSON.parse(product.variants || '[]'),
        options: JSON.parse(product.options || '[]')
      }));

      res.json({
        products: parsedProducts,
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

// Get single product
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM products WHERE id = ? OR shopify_id = ?', [id, id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Parse JSON fields
    const parsedProduct = {
      ...product,
      images: JSON.parse(product.images || '[]'),
      variants: JSON.parse(product.variants || '[]'),
      options: JSON.parse(product.options || '[]')
    };

    res.json(parsedProduct);
  });
});

// Get product statistics
router.get('/stats/overview', (req, res) => {
  const queries = [
    'SELECT COUNT(*) as total FROM products',
    'SELECT COUNT(*) as active FROM products WHERE status = "active"',
    'SELECT COUNT(*) as draft FROM products WHERE status = "draft"',
    'SELECT COUNT(*) as archived FROM products WHERE status = "archived"',
    'SELECT vendor, COUNT(*) as count FROM products GROUP BY vendor ORDER BY count DESC LIMIT 10',
    'SELECT SUM(inventory_quantity) as total_inventory FROM products'
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
      active: results[1].active,
      draft: results[2].draft,
      archived: results[3].archived,
      topVendors: results[4],
      totalInventory: results[5].total_inventory || 0
    });
  }).catch(err => {
    res.status(500).json({ error: err.message });
  });
});

module.exports = router;