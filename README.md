# Product Management System

A comprehensive e-commerce product management system with Shopify integration, designed to sync products and orders automatically and provide a foundation for connecting with other platforms like Odoo.

## Features

- **Shopify Integration**: Full sync of products and orders from Shopify
- **Real-time Webhooks**: Automatic updates when products/orders change in Shopify
- **RESTful API**: Complete API for managing products and orders
- **Scheduled Sync**: Automatic background synchronization
- **Extensible Architecture**: Ready for integration with other platforms (Odoo, etc.)
- **SQLite Database**: Lightweight, file-based database for easy deployment
- **Rate Limiting & Security**: Built-in security features

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration

Copy the example environment file and configure your settings:

```bash
copy .env.example .env
```

Edit `.env` with your Shopify credentials:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_PATH=./data/products.db

# Shopify Configuration
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_access_token
SHOPIFY_API_VERSION=2023-10

# Webhook Secret
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Start the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### 4. Initial Sync

Perform your first sync to import all products and orders:

```bash
# Sync products only
curl -X POST http://localhost:3000/api/sync/products

# Sync orders only
curl -X POST http://localhost:3000/api/sync/orders

# Full sync (products + orders)
curl -X POST http://localhost:3000/api/sync/full
```

### 5. Setup Webhooks (Optional)

For real-time updates, set up Shopify webhooks:

```bash
# Make sure WEBHOOK_BASE_URL is set in your .env
echo "WEBHOOK_BASE_URL=https://your-domain.com" >> .env

# Run webhook setup
node scripts/setup-webhooks.js
```

## API Endpoints

### Products

- `GET /api/products` - List products with pagination and filtering
- `GET /api/products/:id` - Get single product
- `GET /api/products/stats/overview` - Product statistics

**Query Parameters for listing:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `search` - Search in title, description, SKU
- `vendor` - Filter by vendor
- `status` - Filter by status (active, draft, archived)

### Orders

- `GET /api/orders` - List orders with pagination and filtering
- `GET /api/orders/:id` - Get single order
- `GET /api/orders/stats/overview` - Order statistics

**Query Parameters for listing:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `search` - Search in order number, email, customer name
- `status` - Filter by order status
- `financial_status` - Filter by financial status

### Synchronization

- `POST /api/sync/products` - Sync products from Shopify
- `POST /api/sync/orders` - Sync orders from Shopify
- `POST /api/sync/full` - Full sync (products + orders)
- `GET /api/sync/history` - View sync history
- `GET /api/sync/status` - Current sync status

### Webhooks

- `POST /api/webhooks/products` - Shopify product webhooks
- `POST /api/webhooks/orders` - Shopify order webhooks

## Database Schema

### Products Table
- Complete product information from Shopify
- Variants, images, and options stored as JSON
- Inventory tracking
- Sync timestamps

### Orders Table
- Full order details including line items
- Customer and address information
- Financial and fulfillment status
- Sync timestamps

### Sync Logs Table
- Track all synchronization operations
- Success/failure status
- Performance metrics

## Scheduled Operations

The system automatically runs:
- **Product sync**: Every 4 hours
- **Order sync**: Every 30 minutes

Scheduling is disabled in development mode.

## Getting Shopify Credentials

1. **Create a Private App** in your Shopify admin:
   - Go to Apps → App and sales channel settings → Develop apps
   - Create an app and configure API access

2. **Required Permissions**:
   - Products: Read access
   - Orders: Read access
   - Inventory: Read access (optional)

3. **Get your credentials**:
   - Store URL: `your-store.myshopify.com`
   - Access Token: From the app's API credentials

## Extending for Other Platforms

The system is designed to be extensible. To add Odoo or other platform integration:

1. Create a new service in `src/services/` (e.g., `odoo.js`)
2. Add sync methods similar to the Shopify service
3. Create routes for the new platform
4. Update the scheduler to include new sync jobs

Example structure for Odoo integration:

```javascript
// src/services/odoo.js
class OdooService {
  async pushProducts(products) {
    // Push products to Odoo
  }
  
  async pushOrders(orders) {
    // Push orders to Odoo
  }
}
```

## Development

### Project Structure

```
src/
├── database/          # Database connection and schema
├── routes/           # API route handlers
├── services/         # Business logic and external integrations
└── server.js         # Main application entry point

scripts/              # Utility scripts
data/                # SQLite database files (auto-created)
```

### Adding New Features

1. **New API endpoints**: Add routes in `src/routes/`
2. **Business logic**: Add services in `src/services/`
3. **Database changes**: Update schema in `src/database/db.js`
4. **Scheduled tasks**: Modify `src/services/scheduler.js`

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure proper database path
3. Set up reverse proxy (nginx)
4. Configure SSL certificates
5. Set up monitoring and logging

## Troubleshooting

### Common Issues

1. **Shopify API Rate Limits**: The system handles rate limiting automatically
2. **Database Locked**: Ensure only one instance is running
3. **Webhook Verification**: Check `SHOPIFY_WEBHOOK_SECRET` is correct

### Logs

Check console output for sync status and errors. All sync operations are logged to the database.

## License

MIT License - feel free to modify and distribute.