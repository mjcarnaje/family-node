# Deployment Guide

This guide covers deploying Family Nodes to production using Vercel with a Neon PostgreSQL database.

## Prerequisites

Before deploying, ensure you have:

- A [GitHub](https://github.com) account with your repository pushed
- A [Vercel](https://vercel.com) account (free tier works)
- A [Neon](https://neon.tech) account for PostgreSQL (free tier available)
- A [Cloudinary](https://cloudinary.com) account for image uploads (free tier available)

## Environment Variables

Your application requires the following environment variables:

| Variable                | Required | Description                                               |
| ----------------------- | -------- | --------------------------------------------------------- |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string                              |
| `BETTER_AUTH_SECRET`    | Yes      | Secret key for authentication (min 32 chars)              |
| `VITE_BETTER_AUTH_URL`  | Yes      | Your production URL (e.g., `https://your-app.vercel.app`) |
| `CLOUDINARY_CLOUD_NAME` | Yes      | Your Cloudinary cloud name                                |
| `CLOUDINARY_API_KEY`    | Yes      | Cloudinary API key (for server-side uploads)              |
| `CLOUDINARY_API_SECRET` | Yes      | Cloudinary API secret (for server-side uploads)           |
| `GOOGLE_CLIENT_ID`      | No       | Google OAuth client ID (optional)                         |
| `GOOGLE_CLIENT_SECRET`  | No       | Google OAuth client secret (optional)                     |

## Step 1: Set Up Neon PostgreSQL

1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project
3. Copy the connection string from the dashboard
   - It looks like: `postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
4. Save this for the `DATABASE_URL` environment variable

## Step 2: Set Up Cloudinary

1. Go to [cloudinary.com](https://cloudinary.com) and create an account
2. From your dashboard, note your **Cloud Name**
3. Go to **Settings** → **Security** to find your **API Key** and **API Secret**
4. Save the following for your environment variables:
   - Cloud name → `CLOUDINARY_CLOUD_NAME`
   - API Key → `CLOUDINARY_API_KEY`
   - API Secret → `CLOUDINARY_API_SECRET`

> **Note**: This application uses server-side uploads, so you don't need to create an unsigned upload preset. All uploads are handled securely through the server.

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Other (Vercel will auto-detect TanStack Start)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.output` (default)
   - **Install Command**: `npm install` (default)
5. Add environment variables:
   - Click **Environment Variables**
   - Add each variable from the table above
   - Generate a secure `BETTER_AUTH_SECRET`:
     ```bash
     openssl rand -base64 32
     ```
6. Click **Deploy**

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add BETTER_AUTH_SECRET
vercel env add VITE_BETTER_AUTH_URL
vercel env add CLOUDINARY_CLOUD_NAME
vercel env add CLOUDINARY_API_KEY
vercel env add CLOUDINARY_API_SECRET

# Deploy to production
vercel --prod
```

## Step 4: Run Database Migrations

After your first deployment, you need to run database migrations:

### Option A: Run Locally Against Production Database

```bash
# Set your production DATABASE_URL locally
export DATABASE_URL="your-neon-connection-string"

# Run migrations
npm run db:migrate
```

### Option B: Use Vercel Build Command

Update your `package.json` build script to include migrations:

```json
{
  "scripts": {
    "build": "npm run db:migrate && vite build && tsc --noEmit"
  }
}
```

> **Note**: This runs migrations on every build. For more control, use Option A.

## Step 5: Verify Deployment

1. Visit your Vercel deployment URL
2. Try creating an account
3. Create a family tree to verify database connectivity
4. Upload a profile image to verify Cloudinary integration

## Custom Domain (Optional)

1. In Vercel, go to your project → **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Update `VITE_BETTER_AUTH_URL` to your custom domain

## Troubleshooting

### Database Connection Errors

- Ensure your Neon database is active (free tier databases may pause after inactivity)
- Verify the connection string includes `?sslmode=require`
- Check that the IP is not blocked (Neon allows all IPs by default)

### Authentication Errors

- Ensure `VITE_BETTER_AUTH_URL` matches your deployment URL exactly
- Verify `BETTER_AUTH_SECRET` is set and at least 32 characters

### Image Upload Errors

- Verify your Cloudinary API credentials are correct
- Check that the cloud name matches your Cloudinary account
- Ensure `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are set correctly

### Build Failures

- Ensure all required environment variables are set
- Check the Vercel build logs for specific errors
- Run `npm run build` locally to test

## Platform Comparison: Vercel vs Railway

### Why Vercel is Recommended (Free Tier)

**Vercel Advantages:**

- ✅ **Optimized for TanStack Start**: Built-in support for serverless functions and edge runtime
- ✅ **Better Free Tier**: 100GB bandwidth/month, unlimited requests (within limits)
- ✅ **Zero Configuration**: Auto-detects TanStack Start, handles routing automatically
- ✅ **Global CDN**: Automatic edge caching for better performance worldwide
- ✅ **Perfect for This App**: Your collaboration features use polling (not WebSockets), which works great with serverless
- ✅ **Easier Setup**: Connect GitHub → auto-deploy, no Dockerfile needed

**Vercel Limitations:**

- ⚠️ Serverless function timeout: 10 seconds on free tier (60s on Pro)
- ⚠️ No persistent WebSocket connections (but your app doesn't need them)

### When to Choose Railway Instead

**Railway Advantages:**

- ✅ **Persistent Processes**: Better for long-running tasks or WebSocket connections
- ✅ **More Control**: Full Node.js runtime, can run background workers
- ✅ **Free Tier**: $5/month credit (~500 hours runtime)

**Railway Considerations:**

- ⚠️ Less optimized for TanStack Start (still works, but requires more config)
- ⚠️ No built-in CDN (slower global performance)
- ⚠️ Need to manage Dockerfile or build configuration

**Recommendation**: Use **Vercel** for this application. Your app is serverless-friendly, and Vercel's free tier is more generous for typical usage patterns.

## Alternative Deployment Options

### Railway

If you prefer Railway (e.g., for persistent WebSocket connections in the future):

1. Create a Railway account at [railway.app](https://railway.app)
2. Create a new project and add a PostgreSQL database (or use Neon)
3. Add your GitHub repository
4. Set the same environment variables
5. Configure build settings:
   - **Build Command**: `npm run build`
   - **Start Command**: `node .output/server/index.mjs`
   - **Root Directory**: `/` (default)
6. Railway auto-detects and deploys Node.js applications

> **Note**: Railway works well but requires more configuration. Vercel is recommended for TanStack Start applications.

### Docker (Self-Hosted)

```bash
# Build the application
npm run build

# Create a Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY .output .output
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
EOF

# Build and run
docker build -t family-nodes .
docker run -p 3000:3000 --env-file .env family-nodes
```

## Production Checklist

- [ ] Database migrations run successfully
- [ ] All environment variables configured
- [ ] User registration and login working
- [ ] Family tree creation working
- [ ] Image uploads working
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (automatic on Vercel)
