const express = require('express');
const { renameProject } = require('./rename');
const { findProjectRow, updateStatusColumns } = require('./sheets');

const router = express.Router();

/**
 * POST /rename-project
 * Rename a PINFO project in Google Drive
 */
router.post('/rename-project', async (req, res) => {
  try {
    const { previousName, currentName, vendorName } = req.body;

    // Validate required fields
    if (!previousName) {
      return res.status(400).json({
        status: false,
        error: 'previousName is required'
      });
    }

    if (!currentName) {
      return res.status(400).json({
        status: false,
        error: 'currentName is required'
      });
    }

    if (!vendorName) {
      return res.status(400).json({
        status: false,
        error: 'vendorName is required'
      });
    }

    // Call rename service
    const result = await renameProject({ previousName, currentName, vendorName });

    // Return success response
    res.json({
      status: true,
      data: result
    });

  } catch (error) {
    console.error('Rename error:', error);

    const { previousName } = req.body;

    // Try to update spreadsheet status columns with error
    if (previousName) {
      try {
        const rowIndex = await findProjectRow(previousName);
        if (rowIndex) {
          await updateStatusColumns(rowIndex, error.message || 'An error occurred during rename', true);
          console.log(`✅ Updated spreadsheet with error status`);
        }
      } catch (sheetError) {
        console.error('❌ Failed to update spreadsheet with error:', sheetError.message);
        // Continue with error response even if sheet update fails
      }
    }

    // Return error response
    res.status(500).json({
      status: false,
      error: error.message || 'An error occurred during rename'
    });
  }
});

module.exports = router;
