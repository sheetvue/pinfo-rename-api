const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;

/**
 * Initialize Firestore with service account credentials
 */
function initializeFirestore() {
  if (db) return db;

  const keyFilePath = path.join(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_KEY_FILE || 'firebasegrantedserviceaccount.json');
  const serviceAccount = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });

  db = admin.firestore();
  console.log('✅ Firestore initialized');
  return db;
}

/**
 * Trigger real-time sync for project name change
 * Updates Firestore document to notify all connected clients
 *
 * @param {Object} params
 * @param {string} params.previousName - Previous project name/ID
 * @param {string} params.currentName - New project name/ID
 * @param {boolean} params.changeId - Whether ID was changed (true) or just name (false)
 */
async function triggerRealtimeSync({ previousName, currentName, changeId = true }) {
  try {
    const firestore = initializeFirestore();

    const docData = {
      clientKey: generateUUID(),
      project: previousName,
      value: currentName,
      changeId: changeId,
      date: new Date().toISOString()
    };

    // Update document with merge to preserve any existing data
    await firestore.doc('pinfo-trigger/changeProjectName').set(docData, { merge: true });

    console.log('✅ Firestore real-time sync triggered');
  } catch (error) {
    console.error('❌ Failed to trigger Firestore sync:', error.message);
    throw error;
  }
}

/**
 * Generate a UUID v4
 * @returns {string} UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = {
  initializeFirestore,
  triggerRealtimeSync
};
