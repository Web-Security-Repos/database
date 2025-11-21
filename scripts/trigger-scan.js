const { Octokit } = require('@octokit/rest');
require('dotenv').config();

/**
 * Script to trigger CodeQL workflow on GitHub repositories
 * 
 * Usage:
 *   node scripts/trigger-scan.js [repo-name]
 *   node scripts/trigger-scan.js --all
 *   node scripts/trigger-scan.js --repo test-xss-nodejs
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = process.env.GITHUB_ORG || 'Web-Security-Repos';
const WORKFLOW_FILE = 'codeql.yml'; // Common CodeQL workflow filename

if (!GITHUB_TOKEN) {
  console.error('❌ Error: GITHUB_TOKEN environment variable is not set.');
  console.error('Please set it in your .env file or environment.');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

/**
 * Trigger CodeQL workflow for a specific repository
 */
async function triggerWorkflow(owner, repo, branch = 'main') {
  try {
    console.log(`🔄 Triggering CodeQL workflow for ${owner}/${repo}...`);
    
    // Try to trigger the workflow
    await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: WORKFLOW_FILE,
      ref: branch
    });
    
    console.log(`✅ Successfully triggered workflow for ${repo}`);
    return true;
  } catch (error) {
    if (error.status === 404) {
      console.log(`⚠️  Workflow not found for ${repo} (may not have CodeQL enabled)`);
    } else {
      console.error(`❌ Error triggering workflow for ${repo}:`, error.message);
    }
    return false;
  }
}

/**
 * Get all repositories in the organization
 */
async function getAllRepositories() {
  try {
    const repos = await octokit.paginate(octokit.rest.repos.listForOrg, {
      org: GITHUB_ORG,
      type: 'all',
      per_page: 100
    });
    return repos;
  } catch (error) {
    console.error('Error fetching repositories:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--all')) {
    // Trigger for all repositories
    console.log(`🚀 Triggering CodeQL workflows for all repositories in ${GITHUB_ORG}...\n`);
    
    const repos = await getAllRepositories();
    let successCount = 0;
    let failCount = 0;
    
    for (const repo of repos) {
      const success = await triggerWorkflow(GITHUB_ORG, repo.name);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successfully triggered: ${successCount}`);
    console.log(`❌ Failed/Not found: ${failCount}`);
    console.log(`📦 Total repositories: ${repos.length}`);
    console.log('='.repeat(60));
    
  } else if (args.includes('--repo')) {
    // Trigger for specific repository
    const repoIndex = args.indexOf('--repo');
    const repoName = args[repoIndex + 1];
    
    if (!repoName) {
      console.error('❌ Error: --repo requires a repository name');
      console.error('Usage: node scripts/trigger-scan.js --repo repo-name');
      process.exit(1);
    }
    
    await triggerWorkflow(GITHUB_ORG, repoName);
    
  } else if (args.length > 0) {
    // Repository name provided as argument
    const repoName = args[0];
    await triggerWorkflow(GITHUB_ORG, repoName);
    
  } else {
    console.log('Usage:');
    console.log('  node scripts/trigger-scan.js [repo-name]');
    console.log('  node scripts/trigger-scan.js --repo [repo-name]');
    console.log('  node scripts/trigger-scan.js --all');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/trigger-scan.js test-xss-nodejs');
    console.log('  node scripts/trigger-scan.js --repo test-sql-injection');
    console.log('  node scripts/trigger-scan.js --all');
  }
}

if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Done!');
      console.log('💡 Note: Workflows may take 5-10 minutes to complete.');
      console.log('💡 Run "node scripts/ingest-data.js" after workflows complete to fetch results.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { triggerWorkflow, getAllRepositories };

