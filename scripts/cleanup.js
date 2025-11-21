const { connectToDatabase, disconnectFromDatabase } = require('../config/connection');
const Repository = require('../models/Repository');
const Analysis = require('../models/Analysis');
const Alert = require('../models/Alert');

/**
 * Cleanup script for old data
 * Run with: node scripts/cleanup.js [options]
 * 
 * Options:
 * --days=N: Delete analyses older than N days (default: 90)
 * --dry-run: Show what would be deleted without actually deleting
 */

async function cleanup(options = {}) {
  try {
    const days = parseInt(options.days) || 90;
    const dryRun = options.dryRun || false;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    console.log(`🚀 Starting cleanup (${dryRun ? 'DRY RUN' : 'LIVE'})...\n`);
    console.log(`📅 Removing data older than ${days} days (before ${cutoffDate.toISOString()})\n`);
    
    await connectToDatabase();

    // Find old analyses
    const oldAnalyses = await Analysis.find({
      created_at: { $lt: cutoffDate }
    });

    console.log(`📊 Found ${oldAnalyses.length} old analyses`);

    if (oldAnalyses.length === 0) {
      console.log('✅ No cleanup needed');
      await disconnectFromDatabase();
      return;
    }

    // Find alerts associated with old analyses
    const analysisIds = oldAnalyses.map(a => a._id);
    const oldAlerts = await Alert.find({
      analysis: { $in: analysisIds }
    });

    console.log(`📊 Found ${oldAlerts.length} associated alerts\n`);

    if (!dryRun) {
      // Delete alerts first (due to foreign key constraints)
      const deletedAlerts = await Alert.deleteMany({
        analysis: { $in: analysisIds }
      });
      console.log(`🗑️  Deleted ${deletedAlerts.deletedCount} alerts`);

      // Delete analyses
      const deletedAnalyses = await Analysis.deleteMany({
        created_at: { $lt: cutoffDate }
      });
      console.log(`🗑️  Deleted ${deletedAnalyses.deletedCount} analyses\n`);

      console.log('✅ Cleanup completed successfully');
    } else {
      console.log('🔍 DRY RUN: Would delete:');
      console.log(`   - ${oldAlerts.length} alerts`);
      console.log(`   - ${oldAnalyses.length} analyses`);
      console.log('\n💡 Run without --dry-run to perform actual deletion');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await disconnectFromDatabase();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};
args.forEach(arg => {
  if (arg.startsWith('--days=')) {
    options.days = arg.split('=')[1];
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  }
});

if (require.main === module) {
  cleanup(options)
    .then(() => {
      console.log('\n✅ Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanup };

