const { connectToDatabase, disconnectFromDatabase } = require('../config/connection');
const Repository = require('../models/Repository');
const Analysis = require('../models/Analysis');
const Alert = require('../models/Alert');
const fs = require('fs');
const path = require('path');

/**
 * Backup script for database data
 * Run with: node scripts/backup.js [output-dir]
 * 
 * Creates JSON backup files for each collection
 */

async function backup(outputDir = './backups') {
  try {
    console.log('🚀 Starting database backup...\n');
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(outputDir, `backup-${timestamp}`);
    fs.mkdirSync(backupPath, { recursive: true });

    await connectToDatabase();

    console.log('📦 Backing up collections...\n');

    // Backup Repositories
    console.log('📊 Backing up repositories...');
    const repos = await Repository.find({}).lean();
    fs.writeFileSync(
      path.join(backupPath, 'repositories.json'),
      JSON.stringify(repos, null, 2)
    );
    console.log(`✅ Backed up ${repos.length} repositories`);

    // Backup Analyses
    console.log('📊 Backing up analyses...');
    const analyses = await Analysis.find({}).lean();
    fs.writeFileSync(
      path.join(backupPath, 'analyses.json'),
      JSON.stringify(analyses, null, 2)
    );
    console.log(`✅ Backed up ${analyses.length} analyses`);

    // Backup Alerts
    console.log('📊 Backing up alerts...');
    const alerts = await Alert.find({}).lean();
    fs.writeFileSync(
      path.join(backupPath, 'alerts.json'),
      JSON.stringify(alerts, null, 2)
    );
    console.log(`✅ Backed up ${alerts.length} alerts\n`);

    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      collections: {
        repositories: repos.length,
        analyses: analyses.length,
        alerts: alerts.length
      }
    };
    fs.writeFileSync(
      path.join(backupPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log(`✅ Backup completed: ${backupPath}`);
    console.log(`📁 Backup location: ${path.resolve(backupPath)}\n`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

if (require.main === module) {
  const outputDir = process.argv[2] || './backups';
  backup(outputDir)
    .then(() => {
      console.log('✅ Backup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Backup script failed:', error);
      process.exit(1);
    });
}

module.exports = { backup };

