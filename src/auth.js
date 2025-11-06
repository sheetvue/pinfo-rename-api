const { google } = require('googleapis');
require('dotenv').config();

/**
 * Creates and returns an authenticated Google Drive API client
 * Uses OAuth refresh token to generate access tokens automatically
 */
function getAuthenticatedClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob' // Redirect URI for installed apps
  );

  // Set the refresh token
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  return oauth2Client;
}

/**
 * Returns an authenticated Google Drive v3 client
 */
function getDriveClient() {
  const auth = getAuthenticatedClient();
  return google.drive({ version: 'v3', auth });
}

module.exports = {
  getAuthenticatedClient,
  getDriveClient
};
