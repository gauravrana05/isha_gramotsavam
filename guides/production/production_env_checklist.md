# Production Environment Checklist

## ✅ Required Environment Variables (Verify in Vercel Dashboard)

### Database
- [ ] `DATABASE_URL` - Production PostgreSQL connection string
- [ ] `DIRECT_URL` - Direct database connection (if using connection pooling)

### Authentication  
- [ ] `NEXTAUTH_URL` - Production domain URL
- [ ] `NEXTAUTH_SECRET` - Secure random string (32+ chars)
- [ ] `ISHA_OIDC_ISSUER` - Isha SSO endpoint
- [ ] `ISHA_OIDC_CLIENT_ID` - Production client ID
- [ ] `ISHA_OIDC_CLIENT_SECRET` - Production client secret

### Storage & Services
- [ ] `FIREBASE_PROJECT_ID` - Firebase project ID
- [ ] `FIREBASE_STORAGE_BUCKET` - Storage bucket name
- [ ] `REDIS_URL` - Redis connection string (if using)

### Security
- [ ] `ENCRYPTION_KEY` - Data encryption key
- [ ] `JWT_SECRET` - JWT signing secret

## 🔍 Verification Steps
1. Check all env vars are set in Vercel dashboard
2. Test database connection
3. Verify authentication flow works
4. Test file upload functionality

## ⚠️ Security Notes
- All secrets should be different from development
- Use strong, randomly generated values
- Never commit production secrets to git
