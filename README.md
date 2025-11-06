# PINFO Rename API

Node.js Express API for renaming PINFO projects in Google Drive.

## Features

- Renames project folders and all subfolders recursively
- Renames all files within the project recursively
- Updates shortcuts in "Projects Active" folder
- Uses Google Drive API v3 with OAuth authentication
- Simple REST API interface

## Setup

### Prerequisites

- Node.js (v14 or higher)
- Google OAuth credentials (Client ID, Client Secret, Refresh Token)
- Access to Google Drive with PINFO projects

### Installation

1. Clone the repository:
```bash
git clone https://github.com/sheetvue/pinfo-rename-api.git
cd pinfo-rename-api
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```
PORT=3000
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
```

## Usage

### Start the server

```bash
npm start
```

The server will start on port 3000 (or the port specified in `.env`).

### API Endpoint

#### POST /rename-project

Rename a PINFO project in Google Drive.

**Request:**
```json
{
  "previousName": "PC-BNT1A",
  "currentName": "PC-BNT1B",
  "vendorName": "00-Unallocated"
}
```

**Response (Success):**
```json
{
  "status": true,
  "data": {
    "message": "Project renamed successfully",
    "foldersRenamed": 15,
    "filesRenamed": 42,
    "shortcutsRenamed": 2
  }
}
```

**Response (Error):**
```json
{
  "status": false,
  "error": "Project not found in vendor folder"
}
```

### Health Check

#### GET /health

Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "message": "PINFO Rename API is running"
}
```

## How It Works

1. **Find Vendor Folder**: Navigates from root folder → "PINFO Shared Folder" → vendor folder
2. **Find Project Folder**: Searches for project by exact name (e.g., "PC-BNT1A")
3. **Rename Main Folder**: Renames the main project folder
4. **Rename Subfolders**: Recursively renames all subfolders using string replacement
5. **Rename Files**: Recursively renames all files using string replacement
6. **Update Shortcuts**: Renames shortcuts in "Projects Active" folder

## Project Structure

```
pinfo-rename-api/
├── src/
│   ├── server.js       # Express server entry point
│   ├── routes.js       # API routes
│   ├── auth.js         # Google OAuth authentication
│   └── rename.js       # Core rename logic
├── .env                # Environment variables (not committed)
├── .env.example        # Environment template
├── .gitignore
├── package.json
└── README.md
```

## Deployment

### Hetzner Server

1. SSH into your Hetzner server
2. Clone the repository
3. Install dependencies: `npm install`
4. Create `.env` file with your credentials
5. Start with PM2 (recommended):
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name pinfo-rename-api
   pm2 save
   pm2 startup
   ```
6. Configure nginx reverse proxy (optional)

## Integration with webapp-appscript

Update `Configurator.js` to call this API instead of the addon:

```javascript
let res = UrlFetchApp.fetch("https://your-server-url.com/rename-project", {
  method: "POST",
  contentType: "application/json",
  payload: JSON.stringify({
    previousName: previousName?.split(" - ")[0],
    currentName: value,
    vendorName: vendorName
  }),
  muteHttpExceptions: true,
});
```

## Environment

Currently configured for **Production** environment only:
- Root Folder ID: `0AG1kEkTxGUH8Uk9PVA`

## License

ISC
