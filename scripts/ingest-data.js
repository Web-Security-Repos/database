const { connectToDatabase, disconnectFromDatabase } = require('../config/connection');
const Repository = require('../models/Repository');
const Analysis = require('../models/Analysis');
const Alert = require('../models/Alert');
const GitHubSecurityScanner = require('../../codeql-audit/api/index');

/**
 * Store or update repository in database
 */
async function storeRepository(repoData) {
  try {
    const repo = await Repository.findOneAndUpdate(
      { full_name: repoData.full_name },
      {
        name: repoData.name,
        full_name: repoData.full_name,
        owner: repoData.owner?.login || 'Web-Security-Repos',
        url: repoData.url,
        html_url: repoData.html_url,
        language: repoData.language,
        private: repoData.private,
        codeql_enabled: true, // If we're getting alerts, CodeQL is enabled
        updated_at: new Date()
      },
      { upsert: true, new: true }
    );
    
    // Try to infer vulnerability type from repository name
    if (repo.name.includes('xss')) {
      repo.vulnerability_type = 'XSS';
    } else if (repo.name.includes('sql')) {
      repo.vulnerability_type = 'SQL Injection';
    } else if (repo.name.includes('command')) {
      repo.vulnerability_type = 'Command Injection';
    } else if (repo.name.includes('credential') || repo.name.includes('hardcoded')) {
      repo.vulnerability_type = 'Hardcoded Credentials';
    }
    await repo.save();
    
    return repo;
  } catch (error) {
    console.error(`Error storing repository ${repoData.name}:`, error.message);
    throw error;
  }
}

/**
 * Store analysis in database
 */
async function storeAnalysis(analysisData, repositoryId) {
  try {
    const analysis = await Analysis.findOneAndUpdate(
      { analysis_id: analysisData.id.toString() },
      {
        repository: repositoryId,
        commit_sha: analysisData.commit_sha,
        ref: analysisData.ref,
        tool_name: analysisData.tool?.name || 'CodeQL',
        tool_version: analysisData.tool?.version || null,
        results_count: analysisData.results_count || 0,
        rules_count: analysisData.rules_count || 0,
        created_at: new Date(analysisData.created_at)
      },
      { upsert: true, new: true }
    );
    
    return analysis;
  } catch (error) {
    console.error(`Error storing analysis ${analysisData.id}:`, error.message);
    throw error;
  }
}

/**
 * Store alert in database
 */
async function storeAlert(alertData, analysisId, repositoryId) {
  try {
    const alert = await Alert.findOneAndUpdate(
      { 
        alert_number: alertData.id,
        repository: repositoryId
      },
      {
        analysis: analysisId,
        repository: repositoryId,
        rule_id: alertData.rule_id,
        rule_description: alertData.rule_description,
        severity: alertData.severity || 'warning',
        security_severity: alertData.severity || 'medium',
        state: alertData.state || 'open',
        location: {
          path: alertData.location?.path || 'unknown',
          start_line: alertData.location?.start_line || null,
          end_line: alertData.location?.end_line || null,
          start_column: alertData.location?.start_column || null,
          end_column: alertData.location?.end_column || null
        },
        message: alertData.message || null,
        html_url: alertData.url || null,
        created_at: new Date(alertData.created_at),
        updated_at: new Date(alertData.updated_at || alertData.created_at)
      },
      { upsert: true, new: true }
    );
    
    return alert;
  } catch (error) {
    console.error(`Error storing alert ${alertData.id}:`, error.message);
    throw error;
  }
}

/**
 * Ingest data from GitHub API
 * @param {boolean} shouldDisconnect - Whether to disconnect after ingestion (default: true)
 */
async function ingestData(shouldDisconnect = true) {
  try {
    console.log('🚀 Starting data ingestion...\n');
    
    // Connect to database (will reuse existing connection if already connected)
    await connectToDatabase();
    
    // Initialize scanner
    const scanner = new GitHubSecurityScanner();
    
    // Get all repositories
    console.log('📋 Fetching repositories from GitHub...');
    const repos = await scanner.getAllRepositories();
    console.log(`✅ Found ${repos.length} repositories\n`);
    
    let totalRepos = 0;
    let totalAnalyses = 0;
    let totalAlerts = 0;
    
    // Process each repository
    for (const repoData of repos) {
      try {
        console.log(`\n📦 Processing: ${repoData.name}`);
        
        // Store repository
        const repo = await storeRepository(repoData);
        totalRepos++;
        console.log(`   ✅ Repository stored`);
        
        // Get CodeQL alerts for this repository
        const alerts = await scanner.getCodeQLAlerts(repoData.owner.login, repoData.name);
        
        if (alerts.length > 0) {
          console.log(`   📊 Found ${alerts.length} CodeQL alerts`);
          
          // Group alerts by analysis (we'll create a synthetic analysis if needed)
          // For now, we'll store alerts directly and link them to the repository
          const analysisData = {
            id: `synthetic-${repo._id}-${Date.now()}`,
            commit_sha: 'latest',
            ref: 'refs/heads/main',
            tool: { name: 'CodeQL' },
            results_count: alerts.length,
            rules_count: new Set(alerts.map(a => a.rule?.id)).size,
            created_at: new Date().toISOString()
          };
          
          const analysis = await storeAnalysis(analysisData, repo._id);
          totalAnalyses++;
          console.log(`   ✅ Analysis stored`);
          
          // Store each alert
          for (const alertData of alerts) {
            const formattedAlert = scanner.formatCodeQLAlert(alertData);
            await storeAlert(formattedAlert, analysis._id, repo._id);
            totalAlerts++;
          }
          
          console.log(`   ✅ ${alerts.length} alerts stored`);
          
          // Update repository last scan time
          repo.last_scan_at = new Date();
          await repo.save();
        } else {
          console.log(`   ℹ️  No CodeQL alerts found`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`   ❌ Error processing ${repoData.name}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Ingestion Summary');
    console.log('='.repeat(60));
    console.log(`Repositories processed: ${totalRepos}`);
    console.log(`Analyses stored: ${totalAnalyses}`);
    console.log(`Alerts stored: ${totalAlerts}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    throw error;
  } finally {
    // Only disconnect if explicitly requested (not when called from backend)
    if (shouldDisconnect) {
      await disconnectFromDatabase();
    }
  }
}

// Run if called directly
if (require.main === module) {
  ingestData()
    .then(() => {
      console.log('\n✅ Data ingestion completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Data ingestion failed:', error);
      process.exit(1);
    });
}

module.exports = { ingestData, storeRepository, storeAnalysis, storeAlert };

