# 📋 Service Setup Checklist

**Purpose**: Quick checklist for setting up all service accounts  
**Use**: Mark items as done while following CREDENTIALS_SETUP_GUIDE.md

---

## 🔴 Critical Services (Required for deployment)

### 1. Supabase - PostgreSQL Database
- [ ] Created account at https://supabase.com
- [ ] Created new project (name: `prediction-market-prod`)
- [ ] Saved database password
- [ ] Copied Project Reference ID
- [ ] Copied Region (e.g., `aws-0-us-east-1`)
- [ ] Copied Project URL from Settings → API
- [ ] Copied anon public key from Settings → API
- [ ] Updated `/backend/.env` with credentials
- [ ] Updated `/apps/backend/.env` with credentials
- [ ] Tested connection: `cd backend && npm run prisma:studio`
- [ ] Ran migrations: `cd backend && npm run prisma:migrate`
- [ ] Seeded database: `cd backend && npm run prisma:seed`

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

### 2. Upstash - Redis
- [ ] Created account at https://upstash.com
- [ ] Created Redis database (name: `prediction-market-prod`)
- [ ] Selected region matching Supabase
- [ ] Copied Redis connection URL (starts with `rediss://`)
- [ ] Updated `/backend/.env` with REDIS_URL
- [ ] Updated `/apps/backend/.env` with REDIS_URL
- [ ] Tested connection with Node.js test command

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

### 3. JWT Secrets
- [ ] Generated JWT_SECRET: `openssl rand -base64 32`
- [ ] Generated JWT_REFRESH_SECRET: `openssl rand -base64 32` (different value!)
- [ ] Updated `/backend/.env` with both secrets
- [ ] Updated `/apps/backend/.env` with both secrets
- [ ] Verified both secrets are different
- [ ] Verified both secrets are at least 32 characters

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

### 4. Fly.io - Backend Hosting
- [ ] Created account at https://fly.io
- [ ] Added payment method (required)
- [ ] Installed Fly CLI: `curl -L https://fly.io/install.sh | sh`
- [ ] Logged in: `flyctl auth login`
- [ ] Created app: `cd apps/backend && flyctl launch --name pm-backend`
- [ ] Set DATABASE_URL secret: `flyctl secrets set DATABASE_URL="..."`
- [ ] Set REDIS_URL secret: `flyctl secrets set REDIS_URL="..."`
- [ ] Set JWT_SECRET secret: `flyctl secrets set JWT_SECRET="..."`
- [ ] Set JWT_REFRESH_SECRET secret: `flyctl secrets set JWT_REFRESH_SECRET="..."`
- [ ] Set CORS_ORIGIN secret: `flyctl secrets set CORS_ORIGIN="..."`
- [ ] Deployed: `flyctl deploy`
- [ ] Tested health endpoint: `curl https://pm-backend.fly.dev/health`
- [ ] Copied backend URL (e.g., `https://pm-backend.fly.dev`)

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

### 5. Vercel - Frontend Hosting
- [ ] Created account at https://vercel.com (with GitHub)
- [ ] Imported GitHub repository
- [ ] Set Framework Preset to "Vite"
- [ ] Set Root Directory to `./`
- [ ] Set Build Command to `npm run build`
- [ ] Set Output Directory to `dist`
- [ ] Added environment variable: VITE_API_URL
- [ ] Added environment variable: VITE_WS_URL
- [ ] Deployed project
- [ ] Tested site loads: `https://[project-name].vercel.app`
- [ ] Copied frontend URL

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

## 🟡 Important Services (Recommended)

### 6. Cloudflare - DNS + SSL
- [ ] Created account at https://cloudflare.com
- [ ] Added domain to Cloudflare
- [ ] Updated nameservers at domain registrar
- [ ] Verified nameservers propagated (wait 24-48 hours)
- [ ] Added DNS record: `api` → `pm-backend.fly.dev` (CNAME, proxied)
- [ ] Added DNS record: `app` → `cname.vercel-dns.com` (CNAME, proxied)
- [ ] Set SSL mode to "Full" or "Full (strict)"
- [ ] Verified HTTPS works on both domains
- [ ] Updated Fly.io CORS_ORIGIN: `flyctl secrets set CORS_ORIGIN="https://app.yourdomain.com"`
- [ ] Updated Vercel environment variables with new URLs
- [ ] Tested API: `curl https://api.yourdomain.com/health`
- [ ] Tested frontend: Opens `https://app.yourdomain.com` in browser

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

---

## 🟢 Optional Services

### 7. Sentry - Error Monitoring
- [ ] Created account at https://sentry.io
- [ ] Created organization
- [ ] Created Node.js project for backend
- [ ] Copied backend DSN
- [ ] Created React project for frontend
- [ ] Copied frontend DSN
- [ ] Updated `/backend/.env` with SENTRY_DSN
- [ ] Updated `/apps/backend/.env` with SENTRY_DSN
- [ ] Updated `/.env` with VITE_SENTRY_DSN
- [ ] Set Fly.io secret: `flyctl secrets set SENTRY_DSN="..."`
- [ ] Verified errors are being tracked

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete | ⏭️ Skipped

---

### 8. Resend - Transactional Emails
- [ ] Created account at https://resend.com
- [ ] Verified email
- [ ] Added domain (optional, can use onboarding domain)
- [ ] If using custom domain: Added SPF/DKIM/DMARC DNS records
- [ ] Created API key (name: `Production Backend`)
- [ ] Copied API key (starts with `re_`)
- [ ] Updated `/backend/.env` with RESEND_API_KEY
- [ ] Updated `/apps/backend/.env` with RESEND_API_KEY
- [ ] Set Fly.io secret: `flyctl secrets set RESEND_API_KEY="..."`
- [ ] Tested sending test email

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete | ⏭️ Skipped

---

## 🧪 Testing & Verification

### Local Environment
- [ ] Backend starts locally without errors: `cd backend && npm run dev`
- [ ] Frontend starts locally without errors: `npm run dev`
- [ ] Can register new user via frontend
- [ ] Can login via frontend
- [ ] Database contains test data
- [ ] Redis connection working (no errors in logs)

### Production Environment
- [ ] Backend health check passes: `curl https://api.yourdomain.com/health`
- [ ] Frontend loads: `https://app.yourdomain.com`
- [ ] Can register new user in production
- [ ] Can login in production
- [ ] WebSocket connection established (check browser console)
- [ ] No CORS errors in browser console
- [ ] Sentry receiving events (if enabled)

---

## 📝 Environment Files Status

### Backend
- [ ] `/backend/.env` - All required fields filled
- [ ] `/apps/backend/.env` - All required fields filled
- [ ] Values match between both files
- [ ] No placeholder text remaining (e.g., `[YOUR_PASSWORD]`)

### Frontend
- [ ] `/.env` - API URLs configured
- [ ] URLs match deployed backend
- [ ] Using correct protocol (http/https, ws/wss)

### Git Status
- [ ] `.env` files NOT committed to Git
- [ ] `.gitignore` includes `.env`
- [ ] `.env.example` files ARE committed
- [ ] No secrets in version control

---

## 🔒 Security Verification

- [ ] All passwords are strong (16+ characters)
- [ ] JWT secrets are 32+ characters
- [ ] JWT_SECRET ≠ JWT_REFRESH_SECRET (different values!)
- [ ] No credentials hardcoded in source files
- [ ] `.env` files in `.gitignore`
- [ ] Supabase database has connection security enabled
- [ ] Redis has password authentication
- [ ] CORS_ORIGIN only allows your frontend domain
- [ ] SSL/HTTPS enabled on all production domains

---

## 📊 Progress Summary

Total Services: **8** (5 critical, 1 important, 2 optional)

### Quick Status
- Critical Services Complete: __ / 5
- Important Services Complete: __ / 1
- Optional Services Complete: __ / 2

### Time Estimate
- Critical services: ~2-3 hours
- Important services: ~1 hour
- Optional services: ~30 minutes each
- **Total**: ~4-5 hours

---

## 🆘 Common Issues

### Issue: Can't connect to database
**Solution**: 
1. Check password is correct (no typos)
2. Use `db.[PROJECT_REF].supabase.co` not pooler URL for migrations
3. Verify database is not paused (Supabase free tier)

### Issue: Redis connection timeout
**Solution**:
1. Verify using `rediss://` (with two s's)
2. Check password has no special characters causing issues
3. Test with: `redis-cli -u $REDIS_URL PING`

### Issue: Fly.io deployment fails
**Solution**:
1. Check all secrets are set: `flyctl secrets list`
2. View logs: `flyctl logs`
3. Try building Docker image locally first

### Issue: CORS errors in browser
**Solution**:
1. Verify CORS_ORIGIN matches frontend URL exactly
2. Check protocol (http vs https)
3. No trailing slashes in URLs
4. Redeploy backend after changing CORS_ORIGIN

### Issue: WebSocket connection fails
**Solution**:
1. Use `wss://` for production (not `ws://`)
2. Check Cloudflare proxy is enabled
3. Test with: `wscat -c wss://api.yourdomain.com/ws`

---

## 📞 Need Help?

1. **Check the guide**: `CREDENTIALS_SETUP_GUIDE.md` has detailed instructions
2. **Check service status**: Links in guide
3. **Check logs**: 
   - Backend: `cd backend && npm run dev` or `flyctl logs`
   - Frontend: Browser console (F12)
4. **Test connections**: Commands in guide for database, Redis, etc.

---

## ✅ Final Checklist Before Launch

- [ ] All critical services configured and tested
- [ ] Database has migrations applied
- [ ] Backend deployed and health check passing
- [ ] Frontend deployed and loading
- [ ] Custom domains working (if using)
- [ ] WebSocket connections working
- [ ] No errors in production logs
- [ ] Can create account and login
- [ ] Can create test market (admin user)
- [ ] Monitoring setup (Sentry)
- [ ] Email service setup (Resend) - if needed
- [ ] Team has access to all service dashboards
- [ ] Credentials stored securely (password manager)
- [ ] Backup of all `.env` files in secure location

---

**Last Updated**: October 22, 2025  
**Ready for**: Credential setup and deployment  

---

## 📌 Quick Commands Reference

```bash
# Generate JWT secrets
openssl rand -base64 32

# Test database connection
cd backend && npm run prisma:studio

# Test Redis connection
cd backend && node -e "const Redis=require('ioredis');const r=new Redis(process.env.REDIS_URL);r.ping().then(()=>console.log('✅ OK')).catch(console.error);"

# Deploy to Fly.io
cd apps/backend && flyctl deploy

# View Fly.io logs
flyctl logs

# Set Fly.io secret
flyctl secrets set KEY="value"

# List Fly.io secrets
flyctl secrets list

# Deploy to Vercel (automatic on git push)
# Or manual: vercel --prod

# Check backend health
curl https://api.yourdomain.com/health

# Test WebSocket
npm install -g wscat
wscat -c wss://api.yourdomain.com/ws
```

---

**Status**: 🟡 Ready for credential setup  
**Next**: Follow CREDENTIALS_SETUP_GUIDE.md step by step
