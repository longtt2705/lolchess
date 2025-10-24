# Dokploy Deployment Guide for LOL Chess

## Prerequisites

1. **Dokploy instance** set up and running
2. **MongoDB database** (Atlas or self-hosted)
3. **Redis instance** (optional, for caching)
4. **Domain/subdomain** for your application

## Deployment Steps

### 1. Create New Application in Dokploy

1. Log in to your Dokploy dashboard
2. Click **"Create New Application"**
3. Select **"Git Repository"** as the source
4. Connect your GitHub/GitLab repository
5. Select the `main` branch

### 2. Configure Build Settings

Dokploy will automatically detect the `nixpacks.toml` file and use it for building.

**Build Configuration:**
- **Framework**: Nixpacks (auto-detected)
- **Root Directory**: `/` (project root)
- **Build Command**: Handled by nixpacks.toml
- **Start Command**: Handled by nixpacks.toml

### 3. Set Environment Variables

In Dokploy's Environment Variables section, add the following:

#### Backend Environment Variables

```bash
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
REDIS_PASSWORD=your-redis-password (if required)

# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.com
ALLOWED_ORIGINS=https://your-frontend-domain.com

# Optional: Session Secret
SESSION_SECRET=your-session-secret-key
```

### 4. Configure Networking

#### Backend Port Mapping
- **Container Port**: `3001` (internal)
- **External Port**: `80` or `443` (with SSL)
- **Domain**: `api.your-domain.com`

#### WebSocket Support
Ensure WebSocket support is enabled in Dokploy for real-time game features.

### 5. Static File Serving (Frontend)

Since the frontend is built into `apps/frontend/dist/`, you have two options:

#### Option A: Serve Frontend via Backend (Recommended for simplicity)
Add this to your NestJS `main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  // Serve static frontend files
  app.use(express.static(join(__dirname, '../../frontend/dist')));
  
  // Fallback to index.html for SPA routing
  app.use('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      res.sendFile(join(__dirname, '../../frontend/dist/index.html'));
    }
  });

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
```

#### Option B: Separate Frontend Deployment
Deploy frontend separately to:
- **Vercel** (easiest for React apps)
- **Netlify**
- **Cloudflare Pages**
- Or another Dokploy app serving static files

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

