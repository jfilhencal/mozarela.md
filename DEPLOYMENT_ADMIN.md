# 🚀 Production Deployment Guide - Admin Features

## ✅ Pre-Deployment Security Checklist

Before deploying to production, verify:

- [ ] All code committed to Git
- [ ] `.env` file is in `.gitignore` (never commit secrets!)
- [ ] `create-admin.js` removed or restricted in production
- [ ] Environment variables configured (see below)
- [ ] Rate limiters configured
- [ ] CORS origin set to exact domain
- [ ] COOKIE_SECURE=true
- [ ] npm audit run and vulnerabilities fixed
- [ ] Admin password is strong and secure

---

## 🔧 Railway Deployment Steps

### Step 1: Configure API Service Environment Variables

In Railway Dashboard → API Service → Variables, set:

```bash
NODE_ENV=production
GOOGLE_API_KEY=your-actual-google-api-key
DATABASE_FILE=/data/database.db
COOKIE_SECURE=true
COOKIE_SAMESITE=strict
API_ALLOWED_ORIGIN=https://YOUR-CLIENT-URL.up.railway.app
RATE_LIMIT_MAX=100
ADMIN_RATE_LIMIT_MAX=30
SESSION_TTL_MS=2592000000
LOG_FORMAT=combined
```

**⚠️ CRITICAL:** 
- Replace `YOUR-CLIENT-URL` with your actual client Railway URL
- Get Google API key from: https://aistudio.google.com/app/apikey

### Step 2: Configure Client Service Environment Variables

In Railway Dashboard → Client Service → Variables, set:

```bash
VITE_API_BASE=https://YOUR-API-URL.up.railway.app
VITE_ADSENSE_PUBLISHER_ID=your-publisher-id
```

**⚠️ CRITICAL:**
- Replace `YOUR-API-URL` with your actual API Railway URL

### Step 3: Deploy Both Services

```bash
# Commit changes
git add .
git commit -m "Add admin features with security hardening"
git push origin main
```

Railway will automatically rebuild and deploy.

### Step 4: Create Admin Account

**Option A: Via Railway CLI (Recommended)**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Select API service
railway environment

# Create admin directly in database
railway run sqlite3 /data/database.db "UPDATE users SET isAdmin = 1 WHERE email = 'your-email@example.com';"
```

**Option B: Via Admin Creation Script**

1. SSH into Railway container or use Railway CLI:
```bash
railway run node create-admin.js
```

2. **IMMEDIATELY DELETE** or restrict access to `create-admin.js`:
```bash
# In your repository
git rm API/create-admin.js
git commit -m "Remove admin creation script for security"
git push
```

### Step 5: Verify Deployment

1. Visit your client URL: `https://YOUR-CLIENT-URL.up.railway.app`
2. Login with admin credentials
3. Verify "🔐 Admin" button appears in navbar
4. Test admin features:
   - View statistics
   - Download backup
   - View all users and cases
5. Change admin password immediately if using temporary password

---

## 🔒 Post-Deployment Security

### Immediate Actions

1. **Change Admin Password:**
   - Login → Settings → Change Password

2. **Test Security:**
   - Try accessing admin endpoints without auth → should fail
   - Try accessing with non-admin account → should fail
   - Verify CSRF protection on delete operations

3. **Monitor Logs:**
```bash
railway logs --follow
```

Look for:
- Failed login attempts
- Admin endpoint access
- Rate limit triggers
- Database errors

### Regular Maintenance

**Daily:**
- Check Railway logs for anomalies
- Monitor database size

**Weekly:**
- Download database backup via admin panel
- Review user accounts for suspicious activity

**Monthly:**
- Update dependencies: `npm audit fix`
- Review admin action logs
- Rotate API keys if needed

---

## 📊 Monitoring Admin Activity

### Log Audit Points

The system logs these critical events:
- All admin endpoint access (stats, backup, user management)
- Failed login attempts
- Session creation/destruction
- Database errors

To review logs in Railway:
```bash
railway logs --tail 100
```

To filter for admin actions:
```bash
railway logs | grep "Admin"
```

---

## 🆘 Emergency Procedures

### If Admin Account Compromised

```bash
# 1. Revoke all sessions immediately
railway run sqlite3 /data/database.db "DELETE FROM sessions;"

# 2. Reset admin password via database
railway run sqlite3 /data/database.db "UPDATE users SET password = 'temp-hash' WHERE email = 'admin@example.com';"

# 3. Review audit logs
railway logs --tail 1000 > security-audit.log

# 4. Check for unauthorized changes
railway run sqlite3 /data/database.db "SELECT * FROM users WHERE isAdmin = 1;"
```

### If Database Corrupted

```bash
# 1. Stop API service in Railway dashboard

# 2. Download latest backup (if you have automated backups)
railway run sqlite3 /data/database.db .dump > backup.sql

# 3. Restore from backup
railway run sqlite3 /data/database-new.db < backup.sql

# 4. Verify integrity
railway run sqlite3 /data/database-new.db "PRAGMA integrity_check;"

# 5. Swap databases and restart
```

---

## 🎯 Production vs Development Differences

| Feature | Development | Production |
|---------|-------------|------------|
| COOKIE_SECURE | false | **true** |
| COOKIE_SAMESITE | lax | **strict** |
| CORS origin | * or localhost | **Exact domain** |
| Rate limits | 120/min | **100/min** |
| Admin rate limits | None | **30/min** |
| Login attempts | Unlimited | **5 per 15 min** |
| Error messages | Detailed | **Sanitized** |
| Logging | console | **combined** |
| HTTPS | Optional | **Required** |

---

## 📝 Environment Variable Reference

### Required Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `GOOGLE_API_KEY` | `AIza...` | Google Gemini API key |
| `DATABASE_FILE` | `/data/database.db` | SQLite DB path |
| `COOKIE_SECURE` | `true` | Require HTTPS for cookies |
| `API_ALLOWED_ORIGIN` | `https://app.com` | CORS allowed origin |

### Optional But Recommended

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_MAX` | 120 | Requests per minute |
| `ADMIN_RATE_LIMIT_MAX` | 30 | Admin requests per minute |
| `SESSION_TTL_MS` | 2592000000 | Session timeout (30 days) |
| `LOG_FORMAT` | combined | Morgan log format |

---

## ✅ Deployment Verification Checklist

After deployment, verify:

- [ ] Client loads without errors
- [ ] Can register new user
- [ ] Can login successfully
- [ ] Can create and view cases
- [ ] Admin button visible for admin users
- [ ] Admin dashboard loads
- [ ] Can view statistics
- [ ] Can download backup
- [ ] Can view all users/cases
- [ ] Cannot access admin as regular user
- [ ] Rate limiting works (test with many requests)
- [ ] CSRF protection works (try delete without token)
- [ ] Session persists across page refreshes
- [ ] Logout works correctly
- [ ] HTTPS certificate is valid
- [ ] All API calls use HTTPS
- [ ] No console errors in browser
- [ ] No security warnings

---

## 🎉 You're Live!

Your production deployment with admin features is complete and secured!

**Next steps:**
1. Monitor logs for first 24 hours
2. Create secondary admin account as backup
3. Set up automated database backups
4. Configure monitoring/alerts (optional)
5. Document any custom configurations

**Support:**
- Check logs: `railway logs`
- Review security audit: See `SECURITY_AUDIT.md`
- Issues? Check Railway dashboard for service status
