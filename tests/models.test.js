const mongoose = require('mongoose');
const Repository = require('../models/Repository');
const Analysis = require('../models/Analysis');
const Alert = require('../models/Alert');

// Basic model tests
describe('Database Models', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/web-security-test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Repository Model', () => {
    it('should create a repository with required fields', async () => {
      const repo = new Repository({
        name: 'test-repo',
        full_name: 'org/test-repo',
        owner: 'org',
        url: 'https://api.github.com/repos/org/test-repo',
        html_url: 'https://github.com/org/test-repo'
      });
      
      expect(repo.name).toBe('test-repo');
      expect(repo.full_name).toBe('org/test-repo');
    });

    it('should have default values', () => {
      const repo = new Repository({
        name: 'test',
        full_name: 'org/test',
        owner: 'org',
        url: 'https://api.github.com/repos/org/test',
        html_url: 'https://github.com/org/test'
      });
      
      expect(repo.private).toBe(false);
      expect(repo.codeql_enabled).toBe(false);
      expect(repo.vulnerability_type).toBe('Other');
    });
  });

  describe('Analysis Model', () => {
    it('should create an analysis with required fields', () => {
      const analysis = new Analysis({
        analysis_id: 'test-123',
        repository: new mongoose.Types.ObjectId(),
        commit_sha: 'abc123',
        ref: 'refs/heads/main',
        created_at: new Date()
      });
      
      expect(analysis.analysis_id).toBe('test-123');
      expect(analysis.tool_name).toBe('CodeQL');
    });
  });

  describe('Alert Model', () => {
    it('should create an alert with required fields', () => {
      const alert = new Alert({
        alert_number: 1,
        analysis: new mongoose.Types.ObjectId(),
        repository: new mongoose.Types.ObjectId(),
        rule_id: 'js/xss',
        location: {
          path: 'index.js'
        },
        created_at: new Date(),
        updated_at: new Date()
      });
      
      expect(alert.alert_number).toBe(1);
      expect(alert.rule_id).toBe('js/xss');
      expect(alert.security_severity).toBe('medium');
      expect(alert.state).toBe('open');
    });
  });
});

