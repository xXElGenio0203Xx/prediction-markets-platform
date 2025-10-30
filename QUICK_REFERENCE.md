# 🎯 Quick Reference Card - Service Credentials

**Print this or keep it handy while setting up services**

---

## 1️⃣ Supabase (Database) - CRITICAL

🔗 **Sign up**: https://supabase.com  
📦 **What to create**: New project called `prediction-market-prod`  
📋 **What to copy**:
```
✓ Project Reference ID (Settings → Database)
✓ Database Password (you set this)
✓ Region (e.g., aws-0-us-east-1)
✓ Project URL (Settings → API)
✓ anon public key (Settings → API)
```
📝 **Where it goes**:
- `/backend/.env` → DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY
- `/apps/backend/.env` → DATABASE_URL, DIRECT_URL

---

## 2️⃣ Upstash (Redis) - CRITICAL

🔗 **Sign up**: https://upstash.com  
📦 **What to create**: Redis database called `prediction-market-prod`  
📋 **What to copy**:
```
✓ Redis connection URL (starts with rediss://)
```
📝 **Where it goes**:
- `/backend/.env` → REDIS_URL
- `/apps/backend/.env` → REDIS_URL

---

## 3️⃣ JWT Secrets - CRITICAL

🔗 **No signup needed**  
📦 **What to do**: Run this command TWICE:
```bash
openssl rand -base64 32
```
📋 **What to copy**: Both outputs (they must be different!)
```
✓ First output = JWT_SECRET
✓ Second output = JWT_REFRESH_SECRET
```
📝 **Where it goes**:
- `/backend/.env` → JWT_SECRET, JWT_REFRESH_SECRET
- `/apps/backend/.env` → JWT_SECRET, JWT_REFRESH_SECRET

---

## 4️⃣ Fly.io (Backend Hosting) - CRITICAL

🔗 **Sign up**: https://fly.io  
📦 **What to do**:
```bash
# Install CLI
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Create app
cd apps/backend
flyctl launch --name pm-backend --region iad

# Set all secrets
flyctl secrets set DATABASE_URL="[from Supabase]"
flyctl secrets set REDIS_URL="[from Upstash]"
flyctl secrets set JWT_SECRET="[from step 3]"
flyctl secrets set JWT_REFRESH_SECRET="[from step 3]"
flyctl secrets set CORS_ORIGIN="http://localhost:5173"

# Deploy
flyctl deploy
```
📋 **What to copy**:
```
✓ Backend URL (e.g., https://pm-backend.fly.dev)
```
📝 **Where it goes**:
- `/.env` → VITE_API_URL, VITE_WS_URL

---

## 5️⃣ Vercel (Frontend Hosting) - CRITICAL

🔗 **Sign up**: https://vercel.com (use GitHub)  
📦 **What to do**:
1. Import your GitHub repository
2. Set Framework: Vite
3. Add environment variables:
   - `VITE_API_URL` = `https://pm-backend.fly.dev/api`
   - `VITE_WS_URL` = `wss://pm-backend.fly.dev/ws`
4. Click Deploy

📋 **What to copy**:
```
✓ Frontend URL (e.g., https://your-project.vercel.app)
```

---

## 6️⃣ Cloudflare (DNS) - IMPORTANT

🔗 **Sign up**: https://cloudflare.com  
📦 **What to do**:
1. Add your domain
2. Update nameservers at registrar
3. Wait 24-48 hours
4. Add DNS records:
   - `api` → CNAME → `pm-backend.fly.dev` (proxied)
   - `app` → CNAME → `cname.vercel-dns.com` (proxied)
5. Set SSL to "Full (strict)"

After setup, update:
```bash
# Fly.io
flyctl secrets set CORS_ORIGIN="https://app.yourdomain.com"

# Vercel (in dashboard)
VITE_API_URL=https://api.yourdomain.com/api
VITE_WS_URL=wss://api.yourdomain.com/ws
```

---

## 7️⃣ Sentry (Error Monitoring) - OPTIONAL

🔗 **Sign up**: https://sentry.io  
📦 **What to create**:
- Node.js project for backend
- React project for frontend

📋 **What to copy**:
```
✓ Backend DSN (from Node.js project)
✓ Frontend DSN (from React project)
```
📝 **Where it goes**:
- `/backend/.env` → SENTRY_DSN
- `/apps/backend/.env` → SENTRY_DSN
- `/.env` → VITE_SENTRY_DSN
- Fly.io: `flyctl secrets set SENTRY_DSN="..."`

---

## 8️⃣ Resend (Emails) - OPTIONAL

🔗 **Sign up**: https://resend.com  
📦 **What to do**: Create API key  
📋 **What to copy**:
```
✓ API key (starts with re_)
```
📝 **Where it goes**:
- `/backend/.env` → RESEND_API_KEY
- `/apps/backend/.env` → RESEND_API_KEY
- Fly.io: `flyctl secrets set RESEND_API_KEY="..."`

---

## ✅ Testing Commands

**Test database**:
```bash
cd backend && npm run prisma:studio
```

**Test Redis**:
```bash
cd backend && node -e "const Redis=require('ioredis');const r=new Redis(process.env.REDIS_URL);r.ping().then(()=>console.log('✅ OK')).catch(console.error);"
```

**Test backend local**:
```bash
cd backend && npm run dev
# Then: curl http://localhost:4000/health
```

**Test backend production**:
```bash
curl https://api.yourdomain.com/health
```

**Test frontend local**:
```bash
npm run dev
# Then open: http://localhost:5173
```

---

## 📊 Order of Operations

Do in this order for easiest setup:

1. **Supabase** (15 min) → Database first
2. **Upstash** (10 min) → Redis second
3. **JWT Secrets** (2 min) → Generate locally
4. **Test locally** (10 min) → Make sure it works
5. **Fly.io** (30 min) → Deploy backend
6. **Vercel** (15 min) → Deploy frontend
7. **Cloudflare** (30 min) → Custom domains
8. **Sentry** (10 min) → Optional monitoring
9. **Resend** (10 min) → Optional emails

**Total time**: ~2-3 hours for critical services

---

## 🆘 Emergency Contacts

- **Supabase Status**: https://status.supabase.com
- **Upstash Status**: https://status.upstash.com
- **Fly.io Status**: https://status.flyio.net
- **Vercel Status**: https://vercel-status.com
- **Cloudflare Status**: https://cloudflarestatus.com

---

## 🔐 Security Checklist

- [ ] All passwords 16+ characters
- [ ] JWT secrets 32+ characters
- [ ] JWT_SECRET ≠ JWT_REFRESH_SECRET
- [ ] No `.env` files committed to git
- [ ] All credentials in password manager
- [ ] Backup of all `.env` files saved securely

---

**Need more details?** → See `CREDENTIALS_SETUP_GUIDE.md`  
**Need checklist?** → See `SERVICE_SETUP_CHECKLIST.md`  
**Stuck?** → Check service status pages above
