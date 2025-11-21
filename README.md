# MongoDB Database Integration

This directory contains the MongoDB integration for the Web Security Analysis Dashboard.

## 📋 Structure

```
database/
├── models/           # Mongoose models
│   ├── Repository.js
│   ├── Analysis.js
│   └── Alert.js
├── config/           # Configuration files
│   └── connection.js
├── scripts/           # Data ingestion and utility scripts
│   ├── ingest-data.js
│   └── test-connection.js
└── package.json
```

## 🚀 Setup

### 1. Install Dependencies

```bash
cd database
npm install
```

### 2. Configure MongoDB Connection

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Configure network access (add your IP address or 0.0.0.0/0 for development)
4. Create a database user
5. Get your connection string

### 3. Set Environment Variables

Copy `.env.example` to `.env` and fill in your MongoDB connection string:

```bash
cp .env.example .env
```

Edit `.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/web-security-db?retryWrites=true&w=majority
GITHUB_TOKEN=your_github_token_here
GITHUB_ORG=Web-Security-Repos
```

### 4. Test Connection

```bash
node scripts/test-connection.js
```

## 📊 Database Schema

For detailed schema documentation, see [SCHEMA.md](./SCHEMA.md).

### Repository
- Stores repository metadata
- Links to analyses and alerts
- Tracks vulnerability types

### Analysis
- Stores CodeQL analysis results
- Links to repository
- Can store full SARIF data

### Alert
- Stores individual security alerts
- Links to analysis and repository
- Tracks severity, state, and location

## 🔧 Usage

### Ingest Data from GitHub API

```bash
node scripts/ingest-data.js
```

This script will:
1. Fetch all repositories from the organization
2. Fetch CodeQL analyses for each repository
3. Store repository metadata
4. Store analysis results
5. Store individual alerts

### Database Maintenance

**Migration:**
```bash
node scripts/migrate.js
```
Updates database schema and indexes.

**Cleanup (remove old data):**
```bash
# Dry run (see what would be deleted)
node scripts/cleanup.js --days=90 --dry-run

# Actually delete analyses older than 90 days
node scripts/cleanup.js --days=90
```

**Backup:**
```bash
# Backup to default ./backups directory
node scripts/backup.js

# Backup to custom directory
node scripts/backup.js /path/to/backup
```

### Running Scans

**Important:** The dashboard doesn't run CodeQL scans - it fetches results from GitHub. CodeQL scans are run by GitHub Actions workflows in each repository.

**To fetch latest scan results:**
```bash
node scripts/ingest-data.js
```

**To trigger CodeQL workflows on GitHub:**
```bash
# Trigger for a specific repository
node scripts/trigger-scan.js test-xss-nodejs

# Trigger for all repositories
node scripts/trigger-scan.js --all
```

For more details, see [scripts/SCANNING.md](./scripts/SCANNING.md).

## 📝 Models

### Repository Model
- `name`: Repository name
- `full_name`: Full repository name (owner/repo)
- `vulnerability_type`: Type of vulnerability tested
- `codeql_enabled`: Whether CodeQL is enabled

### Analysis Model
- `analysis_id`: GitHub analysis ID
- `repository`: Reference to Repository
- `commit_sha`: Commit SHA analyzed
- `results_count`: Number of alerts found
- `sarif_data`: Full SARIF report (optional)

### Alert Model
- `alert_number`: GitHub alert number
- `analysis`: Reference to Analysis
- `repository`: Reference to Repository
- `rule_id`: CodeQL rule ID
- `severity`: Alert severity
- `security_severity`: Security severity level
- `location`: File path and line numbers

