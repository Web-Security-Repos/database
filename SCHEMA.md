# Database Schema Design

This document describes the complete database schema for the Web Security Analysis Dashboard.

## Overview

The database uses MongoDB with Mongoose ODM. It consists of three main collections:
- **Repositories**: Stores repository metadata
- **Analyses**: Stores CodeQL analysis runs
- **Alerts**: Stores individual security findings

## Entity Relationship Diagram

```
Repository (1) ────< (N) Analysis
Repository (1) ────< (N) Alert
Analysis (1) ────< (N) Alert
```

## Collections

### Repository Collection

Stores metadata about GitHub repositories being monitored.

**Schema:**
```javascript
{
  name: String (required, indexed),
  full_name: String (required, unique),
  owner: String (required),
  url: String (required),
  html_url: String (required),
  language: String (nullable),
  private: Boolean (default: false),
  vulnerability_type: Enum [
    'XSS', 'SQL Injection', 'Command Injection', 
    'Hardcoded Credentials', 'Path Traversal', 
    'IDOR', 'SSRF', 'CSRF', 
    'Insecure Deserialization', 'Auth Flaws', 'Other'
  ] (default: 'Other', indexed),
  codeql_enabled: Boolean (default: false),
  created_at: Date (default: now),
  updated_at: Date (default: now),
  last_scan_at: Date (nullable)
}
```

**Indexes:**
- `name` (ascending)
- `owner` (ascending)
- `vulnerability_type` (ascending)
- `full_name` (unique)

**Relationships:**
- One-to-Many with `Analysis`
- One-to-Many with `Alert`

### Analysis Collection

Stores CodeQL analysis runs for each repository.

**Schema:**
```javascript
{
  analysis_id: String (required, unique, indexed),
  repository: ObjectId (required, ref: 'Repository', indexed),
  commit_sha: String (required, indexed),
  ref: String (required),
  tool_name: String (default: 'CodeQL'),
  tool_version: String (nullable),
  results_count: Number (default: 0),
  rules_count: Number (default: 0),
  created_at: Date (required),
  sarif_data: Mixed (nullable),
  sarif_stored: Boolean (default: false),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes:**
- `repository` + `created_at` (compound, descending)
- `analysis_id` (unique)
- `commit_sha` (ascending)

**Relationships:**
- Many-to-One with `Repository`
- One-to-Many with `Alert`

**Notes:**
- `sarif_data` stores the full SARIF report if available
- `sarif_stored` indicates whether SARIF data was saved

### Alert Collection

Stores individual security findings/alerts from CodeQL analyses.

**Schema:**
```javascript
{
  alert_number: Number (required),
  analysis: ObjectId (required, ref: 'Analysis', indexed),
  repository: ObjectId (required, ref: 'Repository', indexed),
  rule_id: String (required, indexed),
  rule_description: String (nullable),
  severity: Enum ['error', 'warning', 'note'] (default: 'warning'),
  security_severity: Enum ['critical', 'high', 'medium', 'low'] 
    (default: 'medium', indexed),
  state: Enum ['open', 'dismissed', 'fixed'] 
    (default: 'open', indexed),
  location: {
    path: String (required),
    start_line: Number (nullable),
    end_line: Number (nullable),
    start_column: Number (nullable),
    end_column: Number (nullable)
  },
  message: String (nullable),
  html_url: String (nullable),
  created_at: Date (required),
  updated_at: Date (required),
  dismissed_at: Date (nullable),
  dismissed_by: String (nullable),
  dismissed_reason: String (nullable),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexes:**
- `repository` + `security_severity` (compound)
- `rule_id` (ascending)
- `state` (ascending)
- `created_at` (descending)
- `analysis` (ascending)

**Relationships:**
- Many-to-One with `Repository`
- Many-to-One with `Analysis`

**Notes:**
- `alert_number` is the GitHub alert number
- `security_severity` is the primary severity used in the dashboard
- `severity` is the CodeQL severity level
- Dismissal tracking fields are available for future use

## Data Flow

1. **Ingestion**: `ingest-data.js` script fetches data from GitHub API
2. **Storage**: Data is stored in the order: Repository → Analysis → Alerts
3. **Querying**: Dashboard queries use the query functions in `queries/index.js`

## Index Strategy

Indexes are designed to optimize:
- Repository lookups by name/type
- Alert filtering by severity, state, repository
- Analysis queries by repository and date
- Trend analysis aggregations

## Data Retention

- Analyses and alerts are kept indefinitely (no automatic cleanup)
- Migration scripts can be used to archive old data
- See `scripts/` directory for cleanup utilities

## Future Enhancements

Potential schema additions:
- User collection for authentication
- Alert comments/notes
- Alert assignment to users
- Custom tags/categories
- Alert suppression rules

