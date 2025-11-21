const { connectToDatabase, disconnectFromDatabase } = require('../config/connection');
const Repository = require('../models/Repository');
const Analysis = require('../models/Analysis');
const Alert = require('../models/Alert');

/**
 * Migration script for database schema updates
 * Run with: node scripts/migrate.js
 */

async function migrate() {
  try {
    console.log('🚀 Starting database migration...\n');
    await connectToDatabase();

    // Example migration: Add missing indexes
    console.log('📊 Checking indexes...');
    
    // Ensure all indexes exist
    await Repository.collection.createIndex({ name: 1 });
    await Repository.collection.createIndex({ owner: 1 });
    await Repository.collection.createIndex({ vulnerability_type: 1 });
    
    await Analysis.collection.createIndex({ repository: 1, created_at: -1 });
    await Analysis.collection.createIndex({ analysis_id: 1 });
    await Analysis.collection.createIndex({ commit_sha: 1 });
    
    await Alert.collection.createIndex({ repository: 1, security_severity: 1 });
    await Alert.collection.createIndex({ rule_id: 1 });
    await Alert.collection.createIndex({ state: 1 });
    await Alert.collection.createIndex({ created_at: -1 });
    
    console.log('✅ Indexes verified\n');

    // Example: Update vulnerability_type for repositories without it
    console.log('🔄 Updating repository vulnerability types...');
    const reposWithoutType = await Repository.find({ 
      $or: [
        { vulnerability_type: { $exists: false } },
        { vulnerability_type: null }
      ]
    });
    
    for (const repo of reposWithoutType) {
      // Infer from name
      if (repo.name.toLowerCase().includes('xss')) {
        repo.vulnerability_type = 'XSS';
      } else if (repo.name.toLowerCase().includes('sql')) {
        repo.vulnerability_type = 'SQL Injection';
      } else if (repo.name.toLowerCase().includes('command')) {
        repo.vulnerability_type = 'Command Injection';
      } else if (repo.name.toLowerCase().includes('credential') || repo.name.toLowerCase().includes('hardcoded')) {
        repo.vulnerability_type = 'Hardcoded Credentials';
      } else {
        repo.vulnerability_type = 'Other';
      }
      await repo.save();
    }
    console.log(`✅ Updated ${reposWithoutType.length} repositories\n`);

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

if (require.main === module) {
  migrate()
    .then(() => {
      console.log('\n✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrate };

