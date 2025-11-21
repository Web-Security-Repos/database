const Repository = require('../models/Repository');
const Analysis = require('../models/Analysis');
const Alert = require('../models/Alert');

/**
 * Query Functions for Database Operations
 */

/**
 * Get all repositories
 */
async function getAllRepositories(filters = {}) {
  try {
    const query = {};
    
    if (filters.vulnerability_type) {
      query.vulnerability_type = filters.vulnerability_type;
    }
    
    if (filters.codeql_enabled !== undefined) {
      query.codeql_enabled = filters.codeql_enabled;
    }
    
    const repos = await Repository.find(query).sort({ name: 1 });
    return repos;
  } catch (error) {
    console.error('Error fetching repositories:', error);
    throw error;
  }
}

/**
 * Get repository by ID or name
 */
async function getRepository(identifier) {
  try {
    let repo;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      // MongoDB ObjectId
      repo = await Repository.findById(identifier);
    } else {
      // Repository name or full_name
      repo = await Repository.findOne({
        $or: [
          { name: identifier },
          { full_name: identifier }
        ]
      });
    }
    return repo;
  } catch (error) {
    console.error('Error fetching repository:', error);
    throw error;
  }
}

/**
 * Get analyses for a repository
 */
async function getAnalysesForRepository(repositoryId, options = {}) {
  try {
    const query = { repository: repositoryId };
    
    if (options.limit) {
      const analyses = await Analysis.find(query)
        .sort({ created_at: -1 })
        .limit(options.limit)
        .populate('repository');
      return analyses;
    }
    
    const analyses = await Analysis.find(query)
      .sort({ created_at: -1 })
      .populate('repository');
    return analyses;
  } catch (error) {
    console.error('Error fetching analyses:', error);
    throw error;
  }
}

/**
 * Get alerts with filters
 */
async function getAlerts(filters = {}) {
  try {
    const query = {};
    
    if (filters.repository) {
      query.repository = filters.repository;
    }
    
    if (filters.severity) {
      query.security_severity = filters.severity;
    }
    
    if (filters.state) {
      query.state = filters.state;
    }
    
    if (filters.rule_id) {
      query.rule_id = filters.rule_id;
    }
    
    const alerts = await Alert.find(query)
      .populate('repository')
      .populate('analysis')
      .sort({ created_at: -1 });
    
    if (filters.limit) {
      return alerts.slice(0, filters.limit);
    }
    
    return alerts;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
}

/**
 * Get alerts for a repository
 */
async function getAlertsForRepository(repositoryId, filters = {}) {
  return getAlerts({ ...filters, repository: repositoryId });
}

/**
 * Get summary statistics
 */
async function getSummaryStats() {
  try {
    const [
      totalRepos,
      reposWithCodeQL,
      totalAnalyses,
      totalAlerts,
      alertsBySeverity,
      alertsByState
    ] = await Promise.all([
      Repository.countDocuments(),
      Repository.countDocuments({ codeql_enabled: true }),
      Analysis.countDocuments(),
      Alert.countDocuments(),
      Alert.aggregate([
        {
          $group: {
            _id: '$security_severity',
            count: { $sum: 1 }
          }
        }
      ]),
      Alert.aggregate([
        {
          $group: {
            _id: '$state',
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    const severityBreakdown = {};
    alertsBySeverity.forEach(item => {
      severityBreakdown[item._id || 'unknown'] = item.count;
    });
    
    const stateBreakdown = {};
    alertsByState.forEach(item => {
      stateBreakdown[item._id || 'unknown'] = item.count;
    });
    
    return {
      repositories: {
        total: totalRepos,
        with_codeql: reposWithCodeQL
      },
      analyses: {
        total: totalAnalyses
      },
      alerts: {
        total: totalAlerts,
        by_severity: severityBreakdown,
        by_state: stateBreakdown
      }
    };
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    throw error;
  }
}

/**
 * Get historical trends (analyses over time)
 */
async function getHistoricalTrends(days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const trends = await Analysis.aggregate([
      {
        $match: {
          created_at: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$created_at'
            }
          },
          count: { $sum: 1 },
          total_alerts: { $sum: '$results_count' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    return trends;
  } catch (error) {
    console.error('Error fetching historical trends:', error);
    throw error;
  }
}

/**
 * Get vulnerability distribution by type
 */
async function getVulnerabilityDistribution() {
  try {
    const distribution = await Repository.aggregate([
      {
        $group: {
          _id: '$vulnerability_type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    return distribution;
  } catch (error) {
    console.error('Error fetching vulnerability distribution:', error);
    throw error;
  }
}

module.exports = {
  getAllRepositories,
  getRepository,
  getAnalysesForRepository,
  getAlerts,
  getAlertsForRepository,
  getSummaryStats,
  getHistoricalTrends,
  getVulnerabilityDistribution
};

