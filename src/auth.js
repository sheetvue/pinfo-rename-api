const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Creates and returns an authenticated Google Drive API client
 * Uses Service Account JSON key file for authentication
 */
function getAuthenticatedClient() {
  // Load service account credentials from JSON file
  const keyFilePath = path.join(__dirname, '..', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || 'service-account-key.json');

  if (!fs.existsSync(keyFilePath)) {
    throw new Error(`Service account key file not found at: ${keyFilePath}`);
  }

  const credentials = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));

  // Create auth client from service account
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  return auth;
}

/**
 * Returns an authenticated Google Drive v3 client
 */
async function getDriveClient() {
  const auth = getAuthenticatedClient();
  const authClient = await auth.getClient();
  return google.drive({ version: 'v3', auth: authClient });
}

module.exports = {
  getAuthenticatedClient,
  getDriveClient
};
