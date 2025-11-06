const { getDriveClient } = require('./auth');

// Constants
const PRODUCTION_ROOT_FOLDER_ID = '0ALtqj3zJeCzDUk9PVA';
const PINFO_SHARED_FOLDER = 'PINFO Shared Folder';
const PROJECTS_ACTIVE = 'Projects Active';

/**
 * Find a folder by name within a parent folder
 */
async function findFolderByName(parentId, folderName) {
  const drive = await getDriveClient();

  const query = `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'drive',
    driveId: PRODUCTION_ROOT_FOLDER_ID
  });

  if (!response.data.files || response.data.files.length === 0) {
    return null;
  }

  return response.data.files[0];
}

/**
 * Find vendor folder: Root → vendorName (vendors are directly in Shared Drive root)
 */
async function findVendorFolder(vendorName) {
  // Find vendor folder directly in the Shared Drive root
  const vendorFolder = await findFolderByName(PRODUCTION_ROOT_FOLDER_ID, vendorName);

  if (!vendorFolder) {
    throw new Error(`Vendor folder "${vendorName}" not found in Shared Drive root`);
  }

  return vendorFolder.id;
}

/**
 * Rename a single file/folder using string replacement
 */
async function renameItem(itemId, itemName, oldStr, newStr) {
  const drive = await getDriveClient();

  const newName = itemName.replace(oldStr, newStr);

  // Only rename if the name actually changed
  if (newName === itemName) {
    return false;
  }

  await drive.files.update({
    fileId: itemId,
    requestBody: {
      name: newName
    },
    supportsAllDrives: true
  });

  return true;
}

/**
 * List all items (folders or files) in a folder
 */
async function listItems(parentId, mimeType = null) {
  const drive = await getDriveClient();
  let items = [];
  let pageToken = null;

  let query = `'${parentId}' in parents and trashed = false`;
  if (mimeType) {
    query += ` and mimeType = '${mimeType}'`;
  }

  do {
    const response = await drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 1000,
      pageToken: pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'drive',
      driveId: PRODUCTION_ROOT_FOLDER_ID
    });

    items = items.concat(response.data.files || []);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return items;
}

/**
 * Recursively rename all folders
 */
async function renameAllFolders(folderId, oldStr, newStr) {
  let count = 0;

  // Get all subfolders
  const folders = await listItems(folderId, 'application/vnd.google-apps.folder');

  for (const folder of folders) {
    // Rename the folder
    const renamed = await renameItem(folder.id, folder.name, oldStr, newStr);
    if (renamed) count++;

    // Recursively rename subfolders
    count += await renameAllFolders(folder.id, oldStr, newStr);
  }

  return count;
}

/**
 * Recursively rename all files in a folder and its subfolders
 */
async function renameAllFiles(folderId, oldStr, newStr) {
  let count = 0;

  // Get all files (not folders)
  const allItems = await listItems(folderId);
  const files = allItems.filter(item => item.mimeType !== 'application/vnd.google-apps.folder');

  // Rename files in current folder
  for (const file of files) {
    const renamed = await renameItem(file.id, file.name, oldStr, newStr);
    if (renamed) count++;
  }

  // Get all subfolders and recursively rename files in them
  const folders = allItems.filter(item => item.mimeType === 'application/vnd.google-apps.folder');
  for (const folder of folders) {
    count += await renameAllFiles(folder.id, oldStr, newStr);
  }

  return count;
}

/**
 * Rename shortcuts in "Projects Active" folder
 */
async function renameProjectActiveShortcuts(oldStr, newStr) {
  try {
    // Find "Projects Active" folder in root
    const projectsActiveFolder = await findFolderByName(PRODUCTION_ROOT_FOLDER_ID, PROJECTS_ACTIVE);

    if (!projectsActiveFolder) {
      console.log(`${PROJECTS_ACTIVE} folder not found, skipping shortcuts`);
      return 0;
    }

    // Find shortcut folder by old name
    const shortcutFolder = await findFolderByName(projectsActiveFolder.id, oldStr);

    if (!shortcutFolder) {
      console.log(`Shortcut folder "${oldStr}" not found in ${PROJECTS_ACTIVE}`);
      return 0;
    }

    let count = 0;

    // Rename the shortcut folder
    const folderRenamed = await renameItem(shortcutFolder.id, shortcutFolder.name, oldStr, newStr);
    if (folderRenamed) count++;

    // Find and rename the shortcut file inside
    const shortcutFile = await findFolderByName(shortcutFolder.id, oldStr);
    if (shortcutFile) {
      const fileRenamed = await renameItem(shortcutFile.id, shortcutFile.name, oldStr, newStr);
      if (fileRenamed) count++;
    }

    return count;
  } catch (error) {
    console.log(`Error renaming shortcuts: ${error.message}`);
    return 0;
  }
}

/**
 * Main rename function
 */
async function renameProject({ previousName, currentName, vendorName }) {
  console.log(`Starting rename: ${previousName} → ${currentName} in vendor "${vendorName}"`);

  // Validate inputs
  if (!previousName || !currentName || !vendorName) {
    throw new Error('previousName, currentName, and vendorName are required');
  }

  if (previousName === currentName) {
    throw new Error('previousName and currentName cannot be the same');
  }

  // Step 1: Find vendor folder
  console.log(`Finding vendor folder: ${vendorName}`);
  const vendorFolderId = await findVendorFolder(vendorName);
  console.log(`Found vendor folder ID: ${vendorFolderId}`);

  // Step 2: Find project folder
  console.log(`Finding project folder: ${previousName}`);
  const projectFolder = await findFolderByName(vendorFolderId, previousName);

  if (!projectFolder) {
    throw new Error(`Project "${previousName}" not found in vendor folder "${vendorName}"`);
  }
  console.log(`Found project folder ID: ${projectFolder.id}`);

  // Step 3: Rename main project folder
  console.log(`Renaming main project folder`);
  await renameItem(projectFolder.id, projectFolder.name, previousName, currentName);

  // Step 4: Recursively rename all subfolders
  console.log(`Renaming subfolders...`);
  const foldersRenamed = await renameAllFolders(projectFolder.id, previousName, currentName);
  console.log(`Renamed ${foldersRenamed} subfolders`);

  // Step 5: Recursively rename all files
  console.log(`Renaming files...`);
  const filesRenamed = await renameAllFiles(projectFolder.id, previousName, currentName);
  console.log(`Renamed ${filesRenamed} files`);

  // Step 6: Update "Projects Active" shortcuts
  console.log(`Updating shortcuts in "${PROJECTS_ACTIVE}"`);
  const shortcutsRenamed = await renameProjectActiveShortcuts(previousName, currentName);
  console.log(`Renamed ${shortcutsRenamed} shortcuts`);

  console.log(`Rename completed successfully`);

  return {
    message: 'Project renamed successfully',
    foldersRenamed: foldersRenamed + 1, // +1 for main folder
    filesRenamed,
    shortcutsRenamed
  };
}

module.exports = {
  renameProject
};
