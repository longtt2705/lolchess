# CORS Configuration Fix for Production

## Problem
```
Access to XMLHttpRequest at 'https://lolchess-api.rakpong.store/games/items?type=combined' 
from origin 'https://lolchess.rakpong.store' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution

### 1. Code Changes (Already Applied)
Updated `apps/backend/src/main.ts` to support production domains through environment variables.

### 2. Set Environment Variable in Dokploy

In your **backend** Dokploy application, add or update the environment variable:

```bash
ALLOWED_ORIGINS=https://lolchess.rakpong.store,https://lolchess-api.rakpong.store
```

**Important Notes:**
- Use **comma-separated** values (no spaces)
- Include **all domains** that will access your API:
  - Your frontend domain: `https://lolchess.rakpong.store`
  - Your backend domain: `https://lolchess-api.rakpong.store` (for API-to-API calls if needed)
  - Any other domains (staging, www, etc.)

### 3. Redeploy Backend

After adding the environment variable:
1. Go to your backend application in Dokploy
2. Click **"Redeploy"** or **"Restart"**
3. Wait for deployment to complete

### 4. Verify CORS is Working

Check the backend logs in Dokploy. You should see:
```
✅ CORS enabled for origins: https://lolchess.rakpong.store, https://lolchess-api.rakpong.store
```

### 5. Test Your Application

1. Open your frontend: `https://lolchess.rakpong.store`
2. Open browser DevTools (F12)
3. Go to Network tab
4. Try accessing the database page or any feature
5. Verify no CORS errors appear

## How the CORS Config Works

The updated `main.ts` now:

1. **Reads from Environment**: 
   ```typescript
   const allowedOrigins = process.env.ALLOWED_ORIGINS
     ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
     : [/* default origins */];
   ```

2. **Validates Origins Dynamically**:
   ```typescript
   origin: (origin, callback) => {
     if (!origin) return callback(null, true); // Allow no-origin requests
     if (allowedOrigins.includes(origin)) {
       callback(null, true); // Allow whitelisted origins
     } else {
       callback(new Error('Not allowed by CORS'));
     }
   }
   ```

3. **Includes Necessary Headers**:
   ```typescript
   credentials: true,
   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
   ```

## Alternative: Allow All Origins (Not Recommended for Production)

If you want to temporarily allow all origins for testing:

```bash
# In Dokploy, set:
ALLOWED_ORIGINS=*
```

Or update the code to:
```typescript
app.enableCors({
  origin: '*',
  credentials: true,
});
```

**⚠️ Warning**: This is insecure and should only be used for development/testing!

## Troubleshooting

### Still Getting CORS Errors?

1. **Check Environment Variable**:
   - Go to Dokploy → Your Backend App → Environment Variables
   - Verify `ALLOWED_ORIGINS` is set correctly
   - No extra spaces or typos in URLs

2. **Verify Backend Restarted**:
   - After changing env vars, backend must restart
   - Check logs for the CORS confirmation message

3. **Check Browser Request**:
   - Open DevTools → Network tab
   - Look at the failed request
   - Check the `Origin` header being sent
   - Ensure it matches your `ALLOWED_ORIGINS`

4. **Check for HTTPS/HTTP Mismatch**:
   - Frontend: `https://lolchess.rakpong.store` ✅
   - Backend: `https://lolchess-api.rakpong.store` ✅
   - Both must use same protocol (HTTPS)

5. **Clear Browser Cache**:
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache entirely

6. **Check Backend Logs**:
   - Look for "CORS blocked origin" warnings
   - This tells you what origin was rejected

## Example Configuration

### For Your Setup:

```bash
# Backend Environment Variables (Dokploy)
APP_TYPE=backend
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://lolchess.rakpong.store,https://lolchess-api.rakpong.store
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
```

### With www Subdomain:

```bash
ALLOWED_ORIGINS=https://lolchess.rakpong.store,https://www.lolchess.rakpong.store,https://lolchess-api.rakpong.store
```

### With Staging Environment:

```bash
ALLOWED_ORIGINS=https://lolchess.rakpong.store,https://staging.lolchess.rakpong.store,https://lolchess-api.rakpong.store
```

## Quick Fix Steps

1. ✅ Code already updated in `main.ts`
2. 📝 Add `ALLOWED_ORIGINS` to Dokploy backend env vars
3. 🔄 Redeploy backend
4. 🧪 Test in browser
5. ✅ CORS should be fixed!

## Need More Help?

If CORS errors persist:
1. Share the exact error message from browser console
2. Share the `Origin` header from the Network tab
3. Share your `ALLOWED_ORIGINS` value (remove sensitive data)
4. Check backend logs for CORS warnings

