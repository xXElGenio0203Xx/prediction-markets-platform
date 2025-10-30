# 🚀 Quick Start: Migrate to Your Startup Repository

## ⚡ Fast Track (30 minutes)

### Step 1: Clean the Code (5 min)
```bash
cd /Users/maria_1/Desktop/browncast-3f78c242

# Run the cleanup script
./cleanup-for-production.sh

# Review changes
git diff

# If looks good, commit
git add -A
git commit -m "chore: Prepare codebase for production migration"
```

### Step 2: Create Your Repository (2 min)

1. Go to: **https://github.com/new**
2. Fill in:
   - **Name**: `your-startup-prediction-markets` (or your choice)
   - **Visibility**: **Private** ⭐ (IMPORTANT for startups!)
   - **Description**: "Production-ready prediction markets platform with CLOB matching engine"
   - **DO NOT** check "Initialize with README"
3. Click **"Create repository"**
4. **Copy the URL** shown (e.g., `https://github.com/YOUR_USERNAME/your-startup-prediction-markets.git`)

### Step 3: Push to Your New Repo (2 min)

```bash
# Remove old remote
git remote remove origin

# Add YOUR repository (use YOUR URL from Step 2)
git remote add origin https://github.com/YOUR_USERNAME/your-startup-prediction-markets.git

# Rename to main branch (standard)
git branch -M main

# Push everything
git push -u origin main

# Create develop branch for active development
git checkout -b develop
git push -u origin develop
```

### Step 4: Verify (1 min)

Go to your repository on GitHub and check:
- ✅ All files are there
- ✅ No `.env` files visible
- ✅ Documentation looks good
- ✅ Both `main` and `develop` branches exist

### Step 5: Set Up Protection (5 min)

In GitHub: `Settings → Branches → Add branch protection rule`

**For `main` branch:**
- Branch name pattern: `main`
- ✅ Require pull request reviews (minimum 1)
- ✅ Require status checks to pass
- ✅ Include administrators

**For `develop` branch:**
- Branch name pattern: `develop`  
- ✅ Require pull request reviews

### Step 6: Add Team Members (5 min)

`Settings → Collaborators → Add people`

Add your team with appropriate roles:
- **Admin**: Co-founders, CTOs
- **Write**: All developers
- **Read**: Designers, stakeholders

### Step 7: Set Up Secrets (5 min)

`Settings → Secrets and variables → Actions → New repository secret`

Add these secrets:
- `DATABASE_URL` - Your production database URL
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `JWT_REFRESH_SECRET` - Generate with: `openssl rand -base64 32`
- `REDIS_URL` - Your Redis URL
- `SENTRY_DSN` - (Optional) For error tracking

### Step 8: Update Docs (5 min)

Manually update these files in your repo:
- `README.md` - Replace "browncast" with your branding
- `LICENSE` - Add your company name
- `HOW_TO_USE_THE_APP.md` - Remove test credentials
- `backend/prisma/seed.ts` - Use env vars for admin (see seed.ts.new)

---

## ✅ You're Done!

Your startup repository is now:
- ✅ Under your control
- ✅ Private and secure
- ✅ Properly organized
- ✅ Protected with branch rules
- ✅ Ready for your team

---

## 📋 Post-Migration Checklist

- [ ] Repository created and pushed
- [ ] Branch protection rules set
- [ ] Team members added
- [ ] GitHub secrets configured
- [ ] Documentation updated
- [ ] Test environment variables set
- [ ] Local development working
- [ ] Staging environment deployed (optional)

---

## 🎯 Your Team Can Now:

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/your-startup-prediction-markets.git
cd your-startup-prediction-markets

# Switch to develop branch (for active work)
git checkout develop

# Install dependencies
npm install
cd backend && npm install && cd ..

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Edit with your actual credentials
nano backend/.env

# Start Docker services
docker compose up -d

# Run migrations
cd backend
npx prisma migrate deploy
npm run prisma:seed
cd ..

# Start development
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
npm run dev

# Visit http://localhost:5173
```

---

## 📚 Full Guide

For complete best practices and detailed explanations, see:
**[STARTUP_MIGRATION_GUIDE.md](./STARTUP_MIGRATION_GUIDE.md)**

---

## 🆘 Need Help?

**Common Issues:**

**"Permission denied"**
→ Make sure you're logged into YOUR GitHub account

**"Remote already exists"**
→ Run `git remote remove origin` first

**"Can't push to repository"**
→ Check repository URL and your access permissions

**"Secrets not working"**
→ Make sure secret names match exactly in your code

---

## 🎉 Congratulations!

Your prediction markets platform is now in your own production-ready repository!

**Next steps:**
1. Share repo URL with your team
2. Set up CI/CD (optional but recommended)
3. Deploy to staging
4. Plan your beta launch

**Your repository**: `https://github.com/YOUR_USERNAME/your-startup-prediction-markets`

---

**Pro tip:** Keep your `main` branch stable and do all development in `develop` branch. Only merge to `main` when ready to deploy to production.
