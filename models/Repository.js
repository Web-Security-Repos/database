const mongoose = require('mongoose');

const repositorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  full_name: {
    type: String,
    required: true,
    unique: true
  },
  owner: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  html_url: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: null
  },
  private: {
    type: Boolean,
    default: false
  },
  vulnerability_type: {
    type: String,
    enum: ['XSS', 'SQL Injection', 'Command Injection', 'Hardcoded Credentials', 'Path Traversal', 'IDOR', 'SSRF', 'CSRF', 'Insecure Deserialization', 'Auth Flaws', 'Other'],
    default: 'Other'
  },
  codeql_enabled: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  last_scan_at: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

repositorySchema.index({ name: 1 });
repositorySchema.index({ owner: 1 });
repositorySchema.index({ vulnerability_type: 1 });

module.exports = mongoose.model('Repository', repositorySchema);

