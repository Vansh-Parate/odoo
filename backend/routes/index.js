import express from 'express';
import { pool } from '../db/index.js';
import authRoutes from './auth.js';
import dbCheckRoutes from './db-check.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test database connection
router.get('/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({ 
      message: 'Database connected successfully',
      currentTime: result.rows[0].current_time
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      error: 'Database connection failed',
      message: error.message 
    });
  }
});

// Auth routes
router.use('/auth', authRoutes);

// Database check routes
router.use('/', dbCheckRoutes);

// ============================================
// PRODUCTS API
// ============================================
router.get('/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, sku, category, uom, stock, reorder_level as "reorderLevel", status
      FROM products
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products', message: error.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const { name, sku, category, uom, initialStock, reorderLevel } = req.body;
    const result = await pool.query(
      `INSERT INTO products (name, sku, category, uom, stock, reorder_level)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, sku, category, uom, stock, reorder_level as "reorderLevel", status`,
      [name, sku, category, uom, initialStock || 0, reorderLevel || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product', message: error.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, category, uom, stock, reorderLevel } = req.body;
    const result = await pool.query(
      `UPDATE products 
       SET name = $1, sku = $2, category = $3, uom = $4, stock = $5, reorder_level = $6
       WHERE id = $7
       RETURNING id, name, sku, category, uom, stock, reorder_level as "reorderLevel", status`,
      [name, sku, category, uom, stock, reorderLevel, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product', message: error.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product', message: error.message });
  }
});

// ============================================
// RECEIPTS API
// ============================================
router.get('/receipts', async (req, res) => {
  try {
    const receiptsResult = await pool.query(`
      SELECT r.id, r.receipt_id as "receiptId", r.supplier, r.date::text as date, r.status,
             COALESCE((SELECT SUM(ri.quantity) FROM receipt_items ri WHERE ri.receipt_id = r.id), 0) as "totalItems"
      FROM receipts r
      ORDER BY r.date DESC, r.created_at DESC
    `);
    
    // Get items for each receipt
    const receipts = await Promise.all(receiptsResult.rows.map(async (receipt) => {
      const itemsResult = await pool.query(
        'SELECT product_id as "productId", quantity FROM receipt_items WHERE receipt_id = $1',
        [receipt.id]
      );
      return {
        ...receipt,
        items: itemsResult.rows,
        totalItems: parseFloat(receipt.totalItems) || 0,
        date: receipt.date.split('T')[0] // Format date as YYYY-MM-DD
      };
    }));
    
    res.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts', message: error.message });
  }
});

router.post('/receipts', async (req, res) => {
  try {
    const { supplier, date, status, items, warehouse_id, location_id } = req.body;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get next receipt number
      const countResult = await client.query('SELECT COUNT(*) as count FROM receipts');
      const receiptNumber = parseInt(countResult.rows[0].count) + 1;
      const receiptId = `RCP-${String(receiptNumber).padStart(3, '0')}`;
      
      // Insert receipt
      const receiptResult = await client.query(
        `INSERT INTO receipts (receipt_id, supplier, date, status, warehouse_id, location_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, receipt_id as "receiptId", supplier, date::text as date, status`,
        [receiptId, supplier, date, status || 'draft', warehouse_id, location_id]
      );
      
      const receipt = receiptResult.rows[0];
      
      // Insert receipt items
      let totalItems = 0;
      for (const item of items || []) {
        await client.query(
          'INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, $3)',
          [receipt.id, item.productId, item.quantity]
        );
        totalItems += item.quantity;
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        ...receipt,
        date: receipt.date.split('T')[0], // Format date as YYYY-MM-DD
        items: items || [],
        totalItems
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating receipt:', error);
    res.status(500).json({ error: 'Failed to create receipt', message: error.message });
  }
});

router.put('/receipts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier, date, status, items } = req.body;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update receipt
      const receiptResult = await client.query(
        `UPDATE receipts 
         SET supplier = $1, date = $2, status = $3
         WHERE id = $4
         RETURNING id, receipt_id as "receiptId", supplier, date::text as date, status`,
        [supplier, date, status, id]
      );
      
      if (receiptResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Receipt not found' });
      }
      
      const receipt = receiptResult.rows[0];
      
      // Delete old items and insert new ones
      await client.query('DELETE FROM receipt_items WHERE receipt_id = $1', [id]);
      
      let totalItems = 0;
      for (const item of items || []) {
        await client.query(
          'INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, $3)',
          [id, item.productId, item.quantity]
        );
        totalItems += item.quantity;
      }
      
      await client.query('COMMIT');
      
      res.json({
        ...receipt,
        date: receipt.date.split('T')[0], // Format date as YYYY-MM-DD
        items: items || [],
        totalItems
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating receipt:', error);
    res.status(500).json({ error: 'Failed to update receipt', message: error.message });
  }
});

router.post('/receipts/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get receipt and items
      const receiptResult = await client.query(
        'SELECT * FROM receipts WHERE id = $1',
        [id]
      );
      
      if (receiptResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Receipt not found' });
      }
      
      const receipt = receiptResult.rows[0];
      
      if (receipt.status === 'done') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Receipt already validated' });
      }
      
      // Get items
      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM receipt_items WHERE receipt_id = $1',
        [id]
      );
      
      // Update product stock
      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
      
      // Update receipt status
      await client.query(
        'UPDATE receipts SET status = $1 WHERE id = $2',
        ['done', id]
      );
      
      await client.query('COMMIT');
      res.json({ message: 'Receipt validated successfully', status: 'done' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error validating receipt:', error);
    res.status(500).json({ error: 'Failed to validate receipt', message: error.message });
  }
});

router.delete('/receipts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM receipts WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    res.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    console.error('Error deleting receipt:', error);
    res.status(500).json({ error: 'Failed to delete receipt', message: error.message });
  }
});

// ============================================
// DELIVERIES API
// ============================================
router.get('/deliveries', async (req, res) => {
  try {
    const deliveriesResult = await pool.query(`
      SELECT d.id, d.delivery_id as "deliveryId", d.customer, d.date::text as date, d.status,
             COALESCE((SELECT SUM(di.quantity) FROM delivery_items di WHERE di.delivery_id = d.id), 0) as "totalItems"
      FROM deliveries d
      ORDER BY d.date DESC, d.created_at DESC
    `);
    
    // Get items for each delivery
    const deliveries = await Promise.all(deliveriesResult.rows.map(async (delivery) => {
      const itemsResult = await pool.query(
        'SELECT product_id as "productId", quantity FROM delivery_items WHERE delivery_id = $1',
        [delivery.id]
      );
      return {
        ...delivery,
        items: itemsResult.rows,
        totalItems: parseFloat(delivery.totalItems) || 0,
        date: delivery.date.split('T')[0] // Format date as YYYY-MM-DD
      };
    }));
    
    res.json(deliveries);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries', message: error.message });
  }
});

router.post('/deliveries', async (req, res) => {
  try {
    const { customer, date, status, items, warehouse_id, location_id } = req.body;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get next delivery number
      const countResult = await client.query('SELECT COUNT(*) as count FROM deliveries');
      const deliveryNumber = parseInt(countResult.rows[0].count) + 1;
      const deliveryId = `DEL-${String(deliveryNumber).padStart(3, '0')}`;
      
      // Insert delivery
      const deliveryResult = await client.query(
        `INSERT INTO deliveries (delivery_id, customer, date, status, warehouse_id, location_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, delivery_id as "deliveryId", customer, date::text as date, status`,
        [deliveryId, customer, date, status || 'draft', warehouse_id, location_id]
      );
      
      const delivery = deliveryResult.rows[0];
      
      // Insert delivery items
      let totalItems = 0;
      for (const item of items || []) {
        await client.query(
          'INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, $3)',
          [delivery.id, item.productId, item.quantity]
        );
        totalItems += item.quantity;
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        ...delivery,
        date: delivery.date.split('T')[0], // Format date as YYYY-MM-DD
        items: items || [],
        totalItems
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({ error: 'Failed to create delivery', message: error.message });
  }
});

router.put('/deliveries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer, date, status, items } = req.body;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update delivery
      const deliveryResult = await client.query(
        `UPDATE deliveries 
         SET customer = $1, date = $2, status = $3
         WHERE id = $4
         RETURNING id, delivery_id as "deliveryId", customer, date::text as date, status`,
        [customer, date, status, id]
      );
      
      if (deliveryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Delivery not found' });
      }
      
      const delivery = deliveryResult.rows[0];
      
      // Delete old items and insert new ones
      await client.query('DELETE FROM delivery_items WHERE delivery_id = $1', [id]);
      
      let totalItems = 0;
      for (const item of items || []) {
        await client.query(
          'INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, $3)',
          [id, item.productId, item.quantity]
        );
        totalItems += item.quantity;
      }
      
      await client.query('COMMIT');
      
      res.json({
        ...delivery,
        date: delivery.date.split('T')[0], // Format date as YYYY-MM-DD
        items: items || [],
        totalItems
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating delivery:', error);
    res.status(500).json({ error: 'Failed to update delivery', message: error.message });
  }
});

router.delete('/deliveries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM deliveries WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.json({ message: 'Delivery deleted successfully' });
  } catch (error) {
    console.error('Error deleting delivery:', error);
    res.status(500).json({ error: 'Failed to delete delivery', message: error.message });
  }
});

export default router;
