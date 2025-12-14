# Mozarela.MD - Development Setup

## Quick Start

### Production (Docker)
```powershell
docker-compose up -d
```
- Client: http://localhost:8080
- API: http://localhost:3001
- Database: `API/database.db`

### Development (Local)
```powershell
# 1. Setup development database (first time only)
cd API
npm run setup-dev-db

# 2. Start API in development mode
npm run dev

# 3. Start Client in development mode (new terminal)
cd ../Client
npm run dev
```
- Client: http://localhost:3000
- API: http://localhost:3001
- Database: `API/database-dev.db`

### Development with Docker
```powershell
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Database Access

### DB Browser for SQLite (Recommended)
1. Download: https://sqlitebrowser.org/
2. Open Database → Select:
   - **Production**: `API/database.db`
   - **Development**: `API/database-dev.db`

### Other Tools
- **DBeaver**: Universal database tool
- **VS Code Extension**: SQLite Viewer
- **Command Line**: `sqlite3 API/database-dev.db`

## Environment Files

- `.env.development` - Development config
- `.env.production` - Production config
- `.env` - Local overrides (gitignored)

## Database Management

**Reset dev database to production state:**
```powershell
cd API
Remove-Item database-dev.db
npm run setup-dev-db
```

**Backup production database:**
```powershell
docker cp mozarelamd-api-1:/data/database.db ./database-backup.db
```
