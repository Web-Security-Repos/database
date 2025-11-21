# How to Run Scans on Repositories

## Understanding the Scan Process

The dashboard **does not run CodeQL scans itself**. Instead, it fetches scan results from GitHub's CodeQL API. Here's how the process works:

### 1. CodeQL Scans Run on GitHub

CodeQL scans are automatically run by GitHub Actions workflows in each repository. These workflows are typically triggered by:
- **Push to main/master branch** (automatic)
- **Pull requests** (automatic)
- **Manual workflow dispatch** (manual trigger)
- **Scheduled runs** (if configured)

### 2. Fetching Results

The dashboard fetches the scan results from GitHub's API and stores them in MongoDB.

## How to "Run a Scan"

### Option 1: Trigger GitHub Actions Workflow (Recommended)

If you want to trigger a new CodeQL scan on GitHub:

1. **Via GitHub Web Interface:**
   - Go to the repository on GitHub
   - Click on "Actions" tab
   - Select the CodeQL workflow
   - Click "Run workflow" button
   - Select the branch and click "Run workflow"

2. **Via GitHub CLI:**
   ```bash
   gh workflow run codeql.yml --repo Web-Security-Repos/repo-name
   ```

3. **Via GitHub API:**
   ```bash
   curl -X POST \
     -H "Authorization: token YOUR_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     https://api.github.com/repos/Web-Security-Repos/repo-name/actions/workflows/codeql.yml/dispatches \
     -d '{"ref":"main"}'
   ```

### Option 2: Fetch Latest Results (What the Dashboard Does)

After CodeQL scans run on GitHub, fetch the latest results:

```bash
cd database
node scripts/ingest-data.js
```

This script:
1. Fetches all repositories from the organization
2. Gets the latest CodeQL alerts from GitHub API
3. Stores them in MongoDB
4. Updates the dashboard automatically

### Option 3: Automated Scheduled Scans

You can set up a cron job or scheduled task to automatically fetch results:

**Linux/Mac:**
```bash
# Add to crontab (runs every hour)
0 * * * * cd /path/to/database && node scripts/ingest-data.js
```

**Windows (Task Scheduler):**
- Create a scheduled task that runs `node scripts/ingest-data.js` from the database directory

## Checking if CodeQL is Enabled

To check if CodeQL is enabled for a repository:

```bash
# Using GitHub CLI
gh api repos/Web-Security-Repos/repo-name/code-scanning/analyses

# Or check the dashboard - repositories with CodeQL enabled will show "✓ Enabled"
```

## Troubleshooting

**No alerts found:**
- CodeQL may not be enabled for the repository
- No scans have run yet (trigger a workflow)
- The repository has no vulnerabilities (good news!)

**Outdated results:**
- Run `ingest-data.js` to fetch latest results
- Check if CodeQL workflow ran successfully on GitHub

## Next Steps

After running a scan:
1. Wait for GitHub Actions to complete (usually 5-10 minutes)
2. Run `node scripts/ingest-data.js` to fetch results
3. Refresh the dashboard to see new data

