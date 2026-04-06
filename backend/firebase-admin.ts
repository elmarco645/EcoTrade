/**
 * Firebase Admin SDK Initialization
 * Backend-only module for server-side Firebase operations
 */
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import { config as loadEnv } from 'dotenv';

// Load environment variables
loadEnv({ path: path.resolve(__dirname, '..', '.env') });

let app: admin.app.App;

function initializeFirebaseAdmin(): admin.app.App {
  // Return existing instance if already initialized
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (credentialPath && fs.existsSync(credentialPath)) {
    // Initialize with service account credentials file
    const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId || serviceAccount.project_id,
      storageBucket: `${projectId || serviceAccount.project_id}.firebasestorage.app`,
    });
    console.log('✅ Firebase Admin initialized with service account credentials');
  } else if (projectId) {
    // Initialize with application default credentials (for cloud environments)
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });
    console.log('✅ Firebase Admin initialized with application default credentials');
  } else {
    throw new Error(
      '❌ Firebase Admin initialization failed: No credentials found.\n' +
      'Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID in your .env file.'
    );
  }

  return app;
}

// Initialize on import
app = initializeFirebaseAdmin();

// Export initialized services
export const firebaseAdmin = app;
export const adminAuth = admin.auth(app);
export const adminDb = admin.firestore(app);
export const adminStorage = admin.storage(app);

export default app;
