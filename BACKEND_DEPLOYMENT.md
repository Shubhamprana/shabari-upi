# Shabari Backend Deployment Guide

This guide will help you deploy the Shabari backend server to **Railway.app** (recommended) for easy, one-click deployment with automatic HTTPS.

---

## Why Deploy the Backend?

The Shabari mobile app uses **hybrid mode** fraud detection:
- **With Backend (Online Mode)**: Real-time threat intelligence from Google Safe Browsing, VirusTotal, live blacklist database, and VPA verification APIs
- **Without Backend (Offline Mode)**: Local pattern-based fraud detection (limited capabilities)

Deploying the backend unlocks the full power of Shabari's fraud detection system.

---

## Option 1: Railway.app (Recommended - Easiest)

### Prerequisites
- GitHub account
- Railway account (sign up at [railway.app](https://railway.app))

### Step 1: Push Code to GitHub

1. Create a new GitHub repository
2. Push the Shabari project to GitHub:

```bash
cd /path/to/shabari
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/shabari.git
git push -u origin main
```

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `shabari` repository
5. Railway will automatically detect the Node.js project

### Step 3: Configure Environment Variables

In the Railway dashboard, go to **Variables** tab and add:

```
# Required API Keys
GOOGLE_SAFE_BROWSING_API_KEY=your_google_safe_browsing_api_key
VIRUSTOTAL_API_KEY=your_virustotal_api_key

# Database (Railway will auto-generate these)
DATABASE_URL=mysql://user:password@host:port/database

# Redis (optional - for caching)
REDIS_URL=redis://host:port

# Node Environment
NODE_ENV=production
```

### Step 4: Add MySQL Database

1. In Railway dashboard, click **"New"** → **"Database"** → **"Add MySQL"**
2. Railway will automatically set `DATABASE_URL` environment variable
3. Run database migrations:
   - Go to **Settings** → **Deploy Triggers**
   - Add build command: `pnpm db:push`

### Step 5: Get Your Backend URL

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy the generated URL (e.g., `https://shabari-production.up.railway.app`)

### Step 6: Update Mobile App

Update the mobile app to use your deployed backend:

1. Open `shabari/.env` file (create if it doesn't exist)
2. Add your Railway backend URL:

```env
EXPO_PUBLIC_API_URL=https://shabari-production.up.railway.app
```

3. Rebuild the mobile app:

```bash
cd shabari
pnpm android  # or pnpm ios
```

### Step 7: Test the Connection

1. Open the Shabari app on your phone
2. Go to **Settings** → **Backend Connection**
3. Tap **"Refresh Status"**
4. You should see **"Online Mode"** with a green checkmark

---

## Option 2: Render.com (Alternative)

### Step 1: Create Render Account

1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account

### Step 2: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your `shabari` repository
3. Configure:
   - **Name**: `shabari-backend`
   - **Environment**: `Node`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Plan**: Free (or paid for better performance)

### Step 3: Add Environment Variables

In the **Environment** tab, add the same variables as Railway (see above).

### Step 4: Add MySQL Database

1. Click **"New +"** → **PostgreSQL** (Render doesn't offer MySQL, use PostgreSQL instead)
2. Update `drizzle/schema.ts` to use PostgreSQL syntax instead of MySQL
3. Copy the database URL and add to environment variables

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait for deployment to complete
3. Copy the generated URL (e.g., `https://shabari-backend.onrender.com`)
4. Update mobile app's `EXPO_PUBLIC_API_URL` as shown above

---

## Option 3: Vercel (For Serverless)

### Prerequisites
- Vercel account ([vercel.com](https://vercel.com))
- Vercel CLI installed: `npm install -g vercel`

### Step 1: Configure for Serverless

1. Create `vercel.json` in project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/_core/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server/_core/index.ts"
    }
  ]
}
```

### Step 2: Deploy

```bash
cd shabari
vercel deploy --prod
```

### Step 3: Add Environment Variables

```bash
vercel env add GOOGLE_SAFE_BROWSING_API_KEY
vercel env add VIRUSTOTAL_API_KEY
vercel env add DATABASE_URL
```

### Step 4: Use Your Vercel URL

Copy the deployment URL and update `EXPO_PUBLIC_API_URL` in the mobile app.

---

## Troubleshooting

### Backend Not Connecting

1. **Check URL**: Ensure `EXPO_PUBLIC_API_URL` in `.env` matches your deployed backend URL
2. **Check Logs**: View Railway/Render logs for errors
3. **Test API**: Open `https://your-backend-url.com/health` in browser (should return `{"status":"ok"}`)
4. **Rebuild App**: After changing `.env`, rebuild the mobile app

### Database Connection Errors

1. **Run Migrations**: Ensure `pnpm db:push` was run after deployment
2. **Check DATABASE_URL**: Verify the database URL is correct in environment variables
3. **Check Database Status**: Ensure the MySQL/PostgreSQL database is running

### API Rate Limits

- **Google Safe Browsing**: Free tier allows 10,000 requests/day
- **VirusTotal**: Free tier allows 4 requests/minute
- Consider upgrading to paid plans for production use

---

## Cost Estimates

### Railway.app
- **Free Tier**: $5 credit/month (enough for testing)
- **Hobby Plan**: $5/month (500 hours)
- **Pro Plan**: $20/month (unlimited)

### Render.com
- **Free Tier**: Available (sleeps after 15 min inactivity)
- **Starter Plan**: $7/month
- **Standard Plan**: $25/month

### Vercel
- **Free Tier**: Generous limits
- **Pro Plan**: $20/month

---

## Next Steps

After deploying the backend:

1. ✅ Test QR scanning with real UPI QR codes
2. ✅ Test link checking from WhatsApp/SMS
3. ✅ Monitor backend logs for errors
4. ✅ Set up monitoring/alerts (Railway/Render have built-in monitoring)
5. ✅ Consider adding a custom domain for production

---

## Support

If you encounter issues:
- Check Railway/Render documentation
- Review backend logs in the dashboard
- Test API endpoints directly using Postman or curl
- Ensure all environment variables are set correctly
