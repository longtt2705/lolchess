# Dokploy Deployment Guide for LOL Chess

## Overview

This monorepo contains both backend (NestJS) and frontend (React) applications. You can deploy them separately or together using the `APP_TYPE` environment variable.

## Deployment Strategies

### Strategy 1: Separate Deployments (Recommended)
Deploy backend and frontend as separate Dokploy applications for better scalability.

### Strategy 2: Combined Deployment
Deploy both in a single application (backend serves frontend static files).

## Prerequisites

1. **Dokploy instance** set up and running
2. **MongoDB database** (Atlas or self-hosted)
3. **Redis instance** (optional, for caching)
4. **Domain/subdomain** for your application

## Deployment Steps

### Option A: Deploy Backend Only

#### 1. Create Backend Application in Dokploy

1. Log in to your Dokploy dashboard
2. Click **"Create New Application"**
3. Name it **"lolchess-backend"**
4. Select **"Git Repository"** as the source
5. Connect your GitHub/GitLab repository
6. Select the `main` branch

#### 2. Configure Backend Build Settings

The `nixpacks.toml` will automatically detect the APP_TYPE and build accordingly.

**Environment Variables for Backend:**
```bash
# Application Type
APP_TYPE=backend

# Node Environment
NODE_ENV=production
PORT=3001

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lolchess?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production

# Redis (if using)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.com
ALLOWED_ORIGINS=https://your-frontend-domain.com

# Optional: Session Secret
SESSION_SECRET=your-session-secret-key
```

#### 3. Configure Backend Networking
- **Container Port**: `3001`
- **Domain**: `api.your-domain.com` or `your-domain.com/api`
- **Enable WebSocket Support**: ✅ (required for real-time features)

### Option B: Deploy Frontend Only

#### 1. Create Frontend Application in Dokploy

1. Click **"Create New Application"**
2. Name it **"lolchess-frontend"**
3. Use the same Git repository
4. Select the `main` branch

#### 2. Configure Frontend Build Settings

**Environment Variables for Frontend:**
```bash
# Application Type
APP_TYPE=frontend

# Node Environment
NODE_ENV=production
PORT=3000

# Backend API URL (point to your backend deployment)
VITE_API_URL=https://api.your-domain.com
```

#### 3. Configure Frontend Networking
- **Container Port**: `3000`
- **Domain**: `your-domain.com` or `app.your-domain.com`

### Option C: Combined Deployment (Backend + Frontend)

#### 1. Create Combined Application

1. Create application named **"lolchess"**
2. Connect to repository

#### 2. Configure Combined Build

**Environment Variables:**
```bash
# Leave APP_TYPE empty or omit it to build both
# APP_TYPE=

NODE_ENV=production
PORT=3001

# All backend environment variables
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-jwt-secret
REDIS_HOST=your-redis-host
REDIS_PORT=6379

# Frontend configuration
VITE_API_URL=/api
```

#### 3. Update Backend to Serve Frontend

Add to `apps/backend/src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  // API routes prefix
  app.setGlobalPrefix('api');

  // Serve static frontend files
  app.useStaticAssets(join(__dirname, '../../frontend/dist'));
  
  // Fallback to index.html for SPA routing
  app.use('*', (req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      res.sendFile(join(__dirname, '../../frontend/dist/index.html'));
    } else {
      next();
    }
  });

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
```

## Environment Variables Reference

### Backend Variables (APP_TYPE=backend)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `APP_TYPE` | Yes | Set to "backend" | `backend` |
| `NODE_ENV` | Yes | Environment | `production` |
| `PORT` | Yes | Server port | `3001` |
| `MONGODB_URI` | Yes | MongoDB connection | `mongodb+srv://...` |
| `JWT_SECRET` | Yes | JWT secret key | `your-secret-key` |
| `REDIS_HOST` | Optional | Redis host | `redis.example.com` |
| `REDIS_PORT` | Optional | Redis port | `6379` |
| `FRONTEND_URL` | Yes | Frontend URL for CORS | `https://app.example.com` |

### Frontend Variables (APP_TYPE=frontend)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `APP_TYPE` | Yes | Set to "frontend" | `frontend` |
| `NODE_ENV` | Yes | Environment | `production` |
| `PORT` | Yes | Server port | `3000` |
| `VITE_API_URL` | Yes | Backend API URL | `https://api.example.com` |

## Complete Deployment Example

### Example 1: Separate Backend and Frontend

**Backend Deployment (lolchess-backend):**
```bash
APP_TYPE=backend
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/lolchess
JWT_SECRET=super-secret-jwt-key-change-in-production
REDIS_HOST=redis.example.com
REDIS_PORT=6379
FRONTEND_URL=https://lolchess.example.com
```

**Frontend Deployment (lolchess-frontend):**
```bash
APP_TYPE=frontend
NODE_ENV=production
PORT=3000
VITE_API_URL=https://api.lolchess.example.com
```

### Example 2: Combined Deployment

**Single Deployment (lolchess):**
```bash
# Omit APP_TYPE or leave empty to build both
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/lolchess
JWT_SECRET=super-secret-jwt-key
VITE_API_URL=/api
FRONTEND_URL=https://lolchess.example.com
```

### 6. Database Setup

#### MongoDB Atlas (Recommended)
1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user
3. Whitelist Dokploy server IP
4. Copy connection string to `MONGODB_URI`

#### Self-hosted MongoDB
If running MongoDB on the same Dokploy instance:
- Use internal Docker network: `mongodb://mongodb:27017/lolchess`

### 7. Redis Setup (Optional)

#### Redis Cloud (Recommended)
1. Create free instance at [redis.com](https://redis.com)
2. Copy host, port, and password
3. Add to environment variables

#### Self-hosted Redis
If running Redis on Dokploy:
- Use internal network: `redis://redis:6379`

### 8. SSL/HTTPS Configuration

Dokploy typically handles SSL automatically:
1. Go to your app's **Domains** section
2. Add your domain
3. Enable **SSL/TLS** (Let's Encrypt)
4. Wait for certificate generation

### 9. Health Checks

Configure health check endpoint in Dokploy:
- **Path**: `/api/health` or `/`
- **Port**: `3001`
- **Interval**: 30 seconds

Add health check endpoint to your backend if not present:

```typescript
// In your app.controller.ts
@Get('health')
getHealth() {
  return { status: 'ok', timestamp: new Date().toISOString() };
}
```

### 10. Deploy!

1. Click **"Deploy"** in Dokploy
2. Monitor build logs
3. Wait for deployment to complete
4. Access your application at the configured domain

## Post-Deployment Checklist

- [ ] Test backend API endpoints
- [ ] Test WebSocket connections (game features)
- [ ] Test frontend loads correctly
- [ ] Test authentication flow
- [ ] Test database connectivity
- [ ] Test Redis caching (if enabled)
- [ ] Verify CORS settings
- [ ] Check application logs for errors
- [ ] Test all game features (lobby, ban/pick, gameplay)

## Troubleshooting

### Build Fails
- Check Node.js version matches (should be 22)
- Verify all dependencies in package.json
- Check build logs in Dokploy

### App Won't Start
- Verify environment variables are set correctly
- Check MongoDB connection string
- Ensure PORT is set to 3001
- Review application logs

### WebSocket Connection Issues
- Ensure WebSocket support is enabled in Dokploy
- Check CORS configuration includes WebSocket origins
- Verify Socket.IO client connects to correct URL

### Frontend Not Loading
- If serving from backend, check static file paths
- Verify build output exists in `apps/frontend/dist`
- Check browser console for errors

### Database Connection Errors
- Verify MongoDB URI format
- Check if IP whitelist includes Dokploy server
- Test connection from Dokploy shell

## Monitoring & Logs

Access logs in Dokploy:
1. Go to your application
2. Click **"Logs"** tab
3. Monitor real-time logs
4. Set up log retention

## Scaling

For production traffic:
- Increase container resources (CPU/RAM)
- Enable horizontal scaling (multiple instances)
- Use MongoDB replica set
- Use Redis cluster for caching
- Consider CDN for static assets

## Backup Strategy

1. **Database**: Enable automated MongoDB backups
2. **Environment Variables**: Keep backup in secure location
3. **Code**: Ensure Git repository is backed up

## Cost Optimization

- Use MongoDB Atlas free tier (512MB)
- Use Redis Cloud free tier (30MB)
- Optimize Docker image size
- Enable container auto-sleep for dev environments

## Support

For issues:
- Check Dokploy documentation: [dokploy.com/docs](https://dokploy.com/docs)
- Review application logs
- Check MongoDB/Redis status
- Verify environment variables

## Additional Notes

- **Node Version**: This app requires Node.js 22 (as per .cursorrules)
- **Monorepo**: Workspace structure is handled by npm workspaces
- **Build Time**: First build may take 3-5 minutes
- **WebSockets**: Required for real-time game features

