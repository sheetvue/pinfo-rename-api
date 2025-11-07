const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Spreadsheet configuration
const SPREADSHEET_ID = '1ds5UR2qJKoIsmMxqxYFT38rVJtHOFFndoFdBmMskTVQ';
const SHEET_NAME = 'Project Configurator';

let sheetsClient = null;

/**
 * Initialize Google Sheets API client
 */
async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const keyFilePath = path.join(__dirname, '..', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || 'service-account-key.json');
  const credentials = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const authClient = await auth.getClient();
  sheetsClient = google.sheets({ version: 'v4', auth: authClient });

  console.log('✅ Google Sheets API initialized');
  return sheetsClient;
}

/**
 * Find row index for a project by previousName
 * Searches columns A, B, C for the previousName
 *
 * @param {string} previousName - Previous project name/ID to search for
 * @returns {Promise<number|null>} Row index (3-based, as rows start from row 3) or null if not found
 */
async function findProjectRow(previousName) {
  try {
    const sheets = await getSheetsClient();

    // Get data from columns A:C starting from row 3
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A3:C`
    });

    const rows = response.data.values || [];

    // Search for previousName in format "ID - Name"
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue; // Need at least columns A and B

      // Column B (index 1) is Project ID, Column C (index 2) is Project Name
      const projectId = row[1]?.toString().trim() || '';
      const projectName = row[2]?.toString().trim() || '';
      const combined = `${projectId} - ${projectName}`;

      if (combined === previousName || projectId === previousName) {
        return i + 3; // Convert to 1-based row number (data starts at row 3)
      }
    }

    console.log(`⚠️  Project not found in sheet: ${previousName}`);
    return null;
  } catch (error) {
    console.error('❌ Error finding project row:', error.message);
    throw error;
  }
}

/**
 * Update project ID in column B
 *
 * @param {number} rowIndex - Row number (1-based)
 * @param {string} newValue - New project ID value
 */
async function updateProjectId(rowIndex, newValue) {
  try {
    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B${rowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[newValue]]
      }
    });

    console.log(`✅ Updated column B at row ${rowIndex} with: ${newValue}`);
  } catch (error) {
    console.error('❌ Error updating project ID:', error.message);
    throw error;
  }
}

/**
 * Update status columns AC and AD
 * AC contains the status/response JSON
 * AD contains error message (cleared on success)
 *
 * @param {number} rowIndex - Row number (1-based)
 * @param {Object|string} response - Response object or error message
 * @param {boolean} isError - Whether this is an error status
 */
async function updateStatusColumns(rowIndex, response, isError = false) {
  try {
    const sheets = await getSheetsClient();

    let statusValue, errorValue;

    if (isError) {
      statusValue = 'renamingError';
      errorValue = typeof response === 'string' ? response : JSON.stringify(response);
    } else {
      // Success: store full JSON response in AC, clear AD
      statusValue = JSON.stringify(response);
      errorValue = '';
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!AC${rowIndex}:AD${rowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: [[statusValue, errorValue]]
      }
    });

    console.log(`✅ Updated status columns at row ${rowIndex}`);
  } catch (error) {
    console.error('❌ Error updating status columns:', error.message);
    throw error;
  }
}

/**
 * Set status to "renaming" before starting rename operation
 *
 * @param {number} rowIndex - Row number (1-based)
 */
async function setRenamingStatus(rowIndex) {
  try {
    const sheets = await getSheetsClient();

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!AC${rowIndex}:AD${rowIndex}`,
      valueInputOption: 'RAW',
      resource: {
        values: [['renaming', '']]
      }
    });

    console.log(`✅ Set status to 'renaming' at row ${rowIndex}`);
  } catch (error) {
    console.error('❌ Error setting renaming status:', error.message);
    throw error;
  }
}

module.exports = {
  getSheetsClient,
  findProjectRow,
  updateProjectId,
  updateStatusColumns,
  setRenamingStatus
};
