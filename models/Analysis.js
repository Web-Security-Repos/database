const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  analysis_id: {
    type: String,
    required: true,
    unique: true
  },
  repository: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Repository',
    required: true,
    index: true
  },
  commit_sha: {
    type: String,
    required: true
  },
  ref: {
    type: String,
    required: true
  },
  tool_name: {
    type: String,
    default: 'CodeQL'
  },
  tool_version: {
    type: String,
    default: null
  },
  results_count: {
    type: Number,
    default: 0
  },
  rules_count: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    required: true
  },
  sarif_data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  sarif_stored: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  autoIndex: false  // Disable automatic index building
});

analysisSchema.index({ repository: 1, created_at: -1 });
analysisSchema.index({ commit_sha: 1 });

module.exports = mongoose.model('Analysis', analysisSchema);

