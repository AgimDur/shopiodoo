const axios = require('axios');

class ShopifyService {
  constructor() {
    this.storeUrl = process.env.SHOPIFY_STORE_URL;
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    this.apiVersion = process.env.SHOPIFY_API_VERSION || '2023-10';
    
    if (!this.storeUrl || !this.accessToken) {
      throw new Error('Shopify credentials not configured');
    }

    this.baseURL = `https://${this.storeUrl}/admin/api/${this.apiVersion}`;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json'
      }
    });
  }

  async getProducts(limit = 250, sinceId = null) {
    try {
      const params = { limit };
      if (sinceId) params.since_id = sinceId;
      
      const response = await this.client.get('/products.json', { params });
      return response.data.products;
    } catch (error) {
      console.error('Error fetching products from Shopify:', error.response?.data || error.message);
      throw error;
    }
  }

  async getOrders(limit = 250, sinceId = null, status = 'any') {
    try {
      const params = { limit, status };
      if (sinceId) params.since_id = sinceId;
      
      const response = await this.client.get('/orders.json', { params });
      return response.data.orders;
    } catch (error) {
      console.error('Error fetching orders from Shopify:', error.response?.data || error.message);
      throw error;
    }
  }

  async getProduct(productId) {
    try {
      const response = await this.client.get(`/products/${productId}.json`);
      return response.data.product;
    } catch (error) {
      console.error('Error fetching product from Shopify:', error.response?.data || error.message);
      throw error;
    }
  }

  async getOrder(orderId) {
    try {
      const response = await this.client.get(`/orders/${orderId}.json`);
      return response.data.order;
    } catch (error) {
      console.error('Error fetching order from Shopify:', error.response?.data || error.message);
      throw error;
    }
  }

  async createWebhook(topic, address) {
    try {
      const webhook = {
        webhook: {
          topic,
          address,
          format: 'json'
        }
      };
      
      const response = await this.client.post('/webhooks.json', webhook);
      return response.data.webhook;
    } catch (error) {
      console.error('Error creating webhook:', error.response?.data || error.message);
      throw error;
    }
  }

  async getWebhooks() {
    try {
      const response = await this.client.get('/webhooks.json');
      return response.data.webhooks;
    } catch (error) {
      console.error('Error fetching webhooks:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = ShopifyService;