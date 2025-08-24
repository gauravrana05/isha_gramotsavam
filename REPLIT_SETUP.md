# Isha Gramotsavam - Replit Migration Setup Guide

## 🚀 Quick Setup

### 1. Create New Replit Project
- Go to [replit.com](https://replit.com)
- Click "Create Repl" → Import from GitHub (recommended) OR create blank Next.js template
- Upload your project files if not using GitHub import

### 2. Environment Variables Setup

**In Replit:**
1. Go to "Secrets" tab (🔒 icon in left sidebar)
2. Add these environment variables:

```env
# Firebase Web SDK Configuration (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDCSeY8hL1GsD86RGwU3kgIU4THEF9yMy0
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=isha-gramotsavam.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=isha-gramotsavam
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=isha-gramotsavam.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=221477987127
NEXT_PUBLIC_FIREBASE_APP_ID=1:221477987127:web:c4f1b64015ca56f9c730b2
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-655V5N8FZV

# Firebase Admin SDK Configuration (Private)
FIREBASE_PROJECT_ID=isha-gramotsavam
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key_here"
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_CLIENT_ID=your_client_id

# Additional Environment Variables
NODE_ENV=production
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Build and Run
```bash
npm run build
npm start
```

## 🛠️ Configuration Files

### `.replit` File
- ✅ Already created in project root
- Configures build/run commands and resources
- Allocates 2 CPU cores and 4GB RAM for optimal performance

### Firebase Security Rules Update

**Update these in Firebase Console:**

1. **Firestore Security Rules** - Add Replit domain:
```javascript
// Add your replit domain
allow read, write: if request.auth != null && 
  (resource == null || 
   request.auth.uid == resource.data.uid ||
   // Add your replit domain here
   request.domain.matches('.*\\.replit\\.dev$'));
```

2. **Authentication Settings**:
   - Add your Replit domain to authorized domains
   - Format: `your-repl-name.your-username.repl.co`

## 📱 PWA Configuration

Your app includes PWA functionality via `next-pwa`. On Replit:

1. PWA will work automatically in production
2. Service worker is disabled in development (Turbopack compatibility)
3. Manifest file is served from `/public`

## 🔄 Development vs Production

**Development Mode:**
```bash
npm run dev
```
- Uses Turbopack for fast development
- PWA is disabled to avoid conflicts

**Production Mode:**
```bash
npm run build && npm start
```
- Full Next.js optimization
- PWA enabled
- All Firebase services active

## 🌐 Multi-language Support

Your app supports these languages: `en`, `hi`, `ta`, `te`, `ml`, `kn`, `or`

- Routes: `/[lang]/...` (e.g., `/en/admin`, `/hi/player`)
- Automatic redirect from `/` to `/en`
- Language switching works automatically

## 📊 Firebase Functions Deployment

If using Firebase Functions (in `/src/lib/firebase/functions/`):

1. **Install Firebase CLI in Replit:**
```bash
npm install -g firebase-tools
```

2. **Login to Firebase:**
```bash
firebase login --no-localhost
```

3. **Deploy Functions:**
```bash
cd src/lib/firebase/functions
npm install
npm run build
firebase deploy --only functions
```

## 🔍 Troubleshooting

### Common Issues:

1. **Environment Variables Not Working:**
   - Ensure variables are in Replit "Secrets" tab
   - Restart the Repl after adding secrets

2. **Firebase Authentication Errors:**
   - Add Replit domain to Firebase authorized domains
   - Check CORS settings in Firebase

3. **Build Failures:**
   - Clear npm cache: `npm cache clean --force`
   - Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

4. **Performance Issues:**
   - Upgrade Replit plan for more resources
   - Current config requests 2 CPU cores + 4GB RAM

5. **PWA Not Working:**
   - Ensure you're testing in production mode (`npm start`)
   - Check service worker registration in browser dev tools

## 📈 Performance Optimization

For this complex tournament management system:

1. **Recommended Replit Plan:** Hacker Plan or higher
2. **Database Optimization:** 
   - Uses optimized Firestore queries (already implemented)
   - Offline caching enabled
3. **Image Optimization:**
   - Next.js Image component configured for Firebase Storage
   - Automatic WebP conversion

## 🚦 Health Check

After deployment, verify these features work:

- [ ] Authentication (login/logout)
- [ ] Role-based routing (admin, captain, player, etc.)
- [ ] File uploads (profile photos, documents)
- [ ] Real-time updates (match results, team status)
- [ ] Multi-language switching
- [ ] PWA installation prompt
- [ ] Offline functionality
- [ ] Firebase Functions (if deployed)

## 🔗 Useful Links

- [Replit Documentation](https://docs.replit.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- Project Context: See `context.md` for detailed architecture

## 💡 Next Steps

1. Test all user journeys (see `USER_JOURNEYS.md`)
2. Configure custom domain (optional)
3. Set up monitoring/analytics
4. Enable Firebase Security Rules for production
5. Configure backup procedures

---

**Need Help?** Check the troubleshooting section or refer to project documentation in `context.md` and `USER_JOURNEYS.md`.