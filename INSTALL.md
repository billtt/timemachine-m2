# Installation Guide

## Quick Start

1. **Run the setup script**:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Start development**:
   ```bash
   npm run dev
   ```

## Manual Installation

If you prefer to install manually:

1. **Install dependencies**:
   ```bash
   npm install
   cd server && npm install && cd ..
   cd client && npm install && cd ..
   ```

2. **Setup environment**:
   ```bash
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

3. **Edit configuration**:
   - Edit `server/.env` with your MongoDB connection details
   - The default database name is `time` (matching your existing setup)

4. **Start development**:
   ```bash
   npm run dev
   ```

## Troubleshooting

### NPM Warnings
The npm warnings about deprecated packages are from transitive dependencies and can be safely ignored. They don't affect functionality.

### Missing Commands
If you get "command not found" errors:
1. Delete all node_modules: `npm run clean`
2. Reinstall: `npm run fresh-install`

### Port Conflicts
- Backend runs on port 5000
- Frontend runs on port 3000
- Make sure these ports are available

### Database Connection
Make sure MongoDB is running on `mongodb://127.0.0.1:27017/time`

## What's Next?

Once running:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- The app will use your existing database data