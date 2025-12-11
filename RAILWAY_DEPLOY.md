# Railway Deployment Guide

Railway doesn't support docker-compose directly. You need to create TWO separate services:

## Service 1: API (Backend)

1. In Railway dashboard, click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `jfilhencal/mozarela.md`
4. **Root Directory**: Set to `API`
5. **Environment Variables**:
   - `GOOGLE_API_KEY`: your-api-key-here
   - `NODE_ENV`: production
   - `PORT`: 3001
   - `DATABASE_FILE`: /data/database.db
   - `COOKIE_SECURE`: true
   - `API_ALLOWED_ORIGIN`: (leave empty for now, add client URL after deployment)

6. Railway will auto-detect the Dockerfile in API folder
7. After deployment, copy the public URL (e.g., `https://your-api.up.railway.app`)

## Service 2: Client (Frontend)

1. Click "New Service" in the same project
2. Select the same repo `jfilhencal/mozarela.md`
3. **Root Directory**: Set to `Client`
4. **Build Arguments**:
   - `VITE_API_BASE`: Use the API URL from step 7 above (e.g., `https://your-api.up.railway.app`)
   - `VITE_ADSENSE_PUBLISHER_ID`: ca-pub-0000000000000000

5. Railway will auto-detect the Dockerfile in Client folder
6. After deployment, get the client URL (e.g., `https://your-app.up.railway.app`)

## Final Step: Update API Environment

Go back to the API service and update:
- `API_ALLOWED_ORIGIN`: Set to your client URL from step 6

Then redeploy both services.

---

## Alternative: Use Render.com (Easier for docker-compose)

Render supports docker-compose better. Just:
1. Go to https://render.com
2. New > Web Service
3. Connect GitHub repo
4. Select "Docker"
5. It will detect docker-compose.yml
6. Add environment variables
7. Deploy!
