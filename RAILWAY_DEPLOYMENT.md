# Railway Deployment Guide

## 🚀 Quick Deploy to Railway

### Step 1: Prepare Your Repository

1. **Push to GitHub** (if not already done):
```bash
git init
git add .
git commit -m "Initial commit - Product Management System"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo-name.git
git push -u origin main
```

### Step 2: Deploy to Railway

1. **Go to Railway**: https://railway.app
2. **Sign up/Login** with GitHub
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your repository**
6. **Railway will automatically detect Node.js and deploy**

### Step 3: Configure Environment Variables

In Railway dashboard, go to your project → Variables tab and add:

```env
NODE_ENV=production
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token
SHOPIFY_API_VERSION=2023-10
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_key
DATABASE_PATH=/app/data/products.db
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important**: Railway will automatically set `PORT` and provide a domain.

### Step 4: Get Your App URL

1. After deployment, Railway provides a URL like: `https://your-app-name.up.railway.app`
2. **Update WEBHOOK_BASE_URL** in Railway variables:
```env
WEBHOOK_BASE_URL=https://your-app-name.up.railway.app
```

### Step 5: Test Your Deployment

1. **Health Check**:
```bash
curl https://your-app-name.up.railway.app/health
```

2. **Initial Sync**:
```bash
curl -X POST https://your-app-name.up.railway.app/api/sync/full
```

3. **Check Products**:
```bash
curl https://your-app-name.up.railway.app/api/products
```

### Step 6: Setup Shopify Webhooks

1. **SSH into Railway** (optional) or use the web interface:
```bash
railway shell
npm run setup-webhooks
```

Or manually set up webhooks in Shopify Admin pointing to:
- Products: `https://your-app-name.up.railway.app/api/webhooks/products`
- Orders: `https://your-app-name.up.railway.app/api/webhooks/orders`

## 🔧 Railway-Specific Features

### Automatic Deployments
- Every push to `main` branch triggers automatic deployment
- Zero-downtime deployments
- Automatic rollback on failure

### Monitoring
- Built-in logs: Railway dashboard → Deployments → View Logs
- Metrics available in dashboard
- Uptime monitoring included

### Custom Domain (Optional)
1. Go to Settings → Domains
2. Add your custom domain
3. Update `WEBHOOK_BASE_URL` to your custom domain

### Database Upgrade (Optional)
If you want to upgrade from SQLite to PostgreSQL:

1. **Add PostgreSQL service** in Railway
2. **Update environment variables**:
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```
3. **Modify database connection** in `src/database/db.js`

## 🛠️ Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Check Node.js version in `package.json`
   - Ensure all dependencies are in `dependencies`, not `devDependencies`

2. **App Crashes**:
   - Check Railway logs
   - Verify environment variables are set
   - Ensure Shopify credentials are correct

3. **Database Issues**:
   - Railway provides persistent storage
   - Database files are preserved between deployments
   - Check `DATABASE_PATH` points to writable directory

4. **Webhook Issues**:
   - Verify `WEBHOOK_BASE_URL` matches your Railway domain
   - Check `SHOPIFY_WEBHOOK_SECRET` is correct
   - Test webhook endpoints manually

### Useful Commands:

```bash
# View logs
railway logs

# Connect to your app
railway shell

# Run commands in production
railway run npm run sync
railway run npm run setup-webhooks

# Check environment
railway variables
```

## 📊 Post-Deployment

### Monitor Your System:
1. **Check sync logs**: `GET /api/sync/history`
2. **View statistics**: `GET /api/products/stats/overview`
3. **Monitor webhooks**: Check Railway logs for webhook activity

### Regular Maintenance:
- Monitor Railway usage and costs
- Check sync performance
- Update Shopify API version annually
- Review and rotate access tokens

## 💰 Railway Pricing

- **Hobby Plan**: $5/month per service
- **Pro Plan**: $20/month per service (higher limits)
- **Usage-based**: Additional charges for high CPU/memory usage

Your app should run comfortably on the Hobby plan for most small to medium e-commerce stores.

## 🔄 Updates and Maintenance

To update your app:
1. Make changes locally
2. Test with `npm run dev`
3. Push to GitHub: `git push origin main`
4. Railway automatically deploys the update

## 🎯 Next Steps

After successful deployment:
1. Set up monitoring alerts
2. Configure custom domain (optional)
3. Implement Odoo integration using the template
4. Add more webhook endpoints as needed
5. Consider upgrading to PostgreSQL for better performance

Your product management system is now live and ready to sync with Shopify! 🎉