# Firebase & Firestore Integration Setup

## Status: ✅ COMPLETE

This document outlines the Firebase and Firestore integration applied to the EcoTrade application.

## What Was Installed & Configured

### 1. **NPM Packages** ✅
All Firebase SDKs required for seamless integration:
- `firebase` - Firebase Client SDK (v12.11.0)
- `firebase-admin` - Firebase Admin SDK (v13.7.0)  
- `firebase-tools` - Firebase CLI tools for deployment & emulation

### 2. **Firebase Service Account Configuration** ✅

**Project Details:**
- **Project ID:** `gen-lang-client-0307452548`
- **Database ID:** `ai-studio-7e592edb-7cbd-43a8-b5aa-f7d24edcd9de`
- **Service Account Email:** `firebase-adminsdk-fbsvc@gen-lang-client-0307452548.iam.gserviceaccount.com`

**Service Account File:**
- Location: `gen-lang-client-0307452548-firebase-adminsdk-fbsvc-56a18b52d9.json`
- Contains: Full credentials for Firebase Admin SDK initialization

### 3. **Environment Configuration** ✅

#### Frontend Configuration (`.env.local`)
```
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0307452548
VITE_FIREBASE_DATABASE_ID=ai-studio-7e592edb-7cbd-43a8-b5aa-f7d24edcd9de
VITE_FIREBASE_API_KEY=AIzaSyDbhO1g-okFY_lUT0oz__Ibvc5ssLsWZzk
VITE_FIREBASE_AUTH_DOMAIN=gen-lang-client-0307452548.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=gen-lang-client-0307452548.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=222319348224
VITE_FIREBASE_APP_ID=1:222319348224:web:cceb1738b753d0875666e5
```

#### Backend Configuration (`.env.local`)
```
FIREBASE_PROJECT_ID=gen-lang-client-0307452548
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@gen-lang-client-0307452548.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=[Your private key from service account]
FIREBASE_DATABASE_ID=ai-studio-7e592edb-7cbd-43a8-b5aa-f7d24edcd9de
GOOGLE_APPLICATION_CREDENTIALS=./gen-lang-client-0307452548-firebase-adminsdk-fbsvc-56a18b52d9.json
```

### 4. **Firebase Configuration Files** ✅

**firebase-applet-config.json** - Client SDK configuration
```json
{
  "projectId": "gen-lang-client-0307452548",
  "appId": "1:222319348224:web:cceb1738b753d0875666e5",
  "apiKey": "AIzaSyDbhO1g-okFY_lUT0oz__Ibvc5ssLsWZzk",
  "authDomain": "gen-lang-client-0307452548.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-7e592edb-7cbd-43a8-b5aa-f7d24edcd9de",
  "storageBucket": "gen-lang-client-0307452548.firebasestorage.app",
  "messagingSenderId": "222319348224"
}
```

## Client SDK Integration

### File: `frontend/src/firebase.ts`
- ✅ Firebase app initialization
- ✅ Authentication (via `getAuth()`)
- ✅ Firestore database (via `getFirestore()`)
- ✅ Cloud Storage (via `getStorage()`)
- ✅ Environment variable fallbacks
- ✅ Support for custom Firestore database IDs

**Exports available:**
```typescript
export { app, auth, db, storage };
```

## Backend Integration

### File: `backend/server.ts`
- ✅ Firebase Admin SDK initialization
- ✅ Service account credential handling
- ✅ Firestore database connection verification
- ✅ Automatic fallback to default database if needed
- ✅ Connection testing on startup
- ✅ Enhanced logging and error handling

**Key Features:**
- Supports both:
  - Service account JSON file (`GOOGLE_APPLICATION_CREDENTIALS`)
  - Individual credentials (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)
- Environment-based project and database ID resolution
- Automatic connection verification on server start

## Firestore Integration

### Database Details
- **Project:** `gen-lang-client-0307452548`
- **Default Database:** `ai-studio-7e592edb-7cbd-43a8-b5aa-f7d24edcd9de`
- **Status:** ✅ Connected & Tested

### Collections Available
- Users (Firebase Auth + Firestore user data)
- Listings (Product/item listings)
- Orders (Transaction history)
- Messages (Chat/messaging)
- And any other collections in your Firestore instance

## Verification Checklist

- ✅ All npm packages installed
- ✅ Service account JSON file present
- ✅ Environment variables configured
- ✅ Frontend Firebase SDK initialized
- ✅ Backend Firebase Admin SDK initialized
- ✅ Firestore connection tested successfully
- ✅ Development server starts without errors
- ✅ Firebase status logged on server startup

## Testing

To verify the setup is working:

```bash
# Start the development server
npm run dev

# Check server output for:
# [SERVER] Firestore initialized for database...
# [SERVER] Firestore connection test successful.
# Server running on http://localhost:3000
```

## Next Steps

1. **Use Firestore in Frontend:**
```typescript
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';

const listings = await getDocs(collection(db, 'listings'));
```

2. **Use Firestore in Backend:**
```typescript
import { firestore } from '@/backend/server'; // or import getFirestore

const doc = await firestore.collection('users').doc(uid).get();
```

3. **Implement Authentication:**
- Use `auth` from frontend for login/signup
- Verify tokens on backend using `firebase-admin`

4. **Deploy to Firebase:**
```bash
firebase deploy
```

## Troubleshooting

### "projectId is unknown"
- This is normal when using Application Default Credentials (ADC)
- The app will still connect to Firestore successfully
- To fix, set `FIREBASE_PROJECT_ID` in environment

### "UNAUTHENTICATED" error
- Verify service account JSON file exists
- Check `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` are set correctly
- Ensure project ID matches the service account's project

### "Database not found"
- Verify the database ID is correct
- Check if database exists in Firebase Console
- May need to create/enable the Firestore database

## Environment File Templates

### `.env.local` (For Local Development)
Use the file in the repository - it has all values pre-configured.

### `.env.example` (For Repository)
Template for team members to copy and configure locally.

## Security Notes

⚠️ **Important:** The service account file and private key should:
- Never be committed to version control
- Never be exposed in client-side code
- Only be used on the backend server
- Be rotated regularly in production

The `.env.local` file is already in `.gitignore` to prevent accidental commits.

## Support

For issues with:
- **Firebase Setup:** https://firebase.google.com/docs
- **Firestore:** https://firebase.google.com/docs/firestore
- **Firebase Admin SDK:** https://firebase.google.com/docs/database/admin/start
- **EcoTrade App:** Check documentation in repository

---

**Last Updated:** April 6, 2026
**Status:** Production Ready ✅
