const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  alert_number: {
    type: Number,
    required: true
  },
  analysis: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Analysis',
    required: true,
    index: true
  },
  repository: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Repository',
    required: true,
    index: true
  },
  rule_id: {
    type: String,
    required: true
  },
  rule_description: {
    type: String,
    default: null
  },
  severity: {
    type: String,
    enum: ['error', 'warning', 'note'],
    default: 'warning'
  },
  security_severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
    index: true
  },
  state: {
    type: String,
    enum: ['open', 'dismissed', 'fixed'],
    default: 'open'
  },
  location: {
    path: {
      type: String,
      required: true
    },
    start_line: {
      type: Number,
      default: null
    },
    end_line: {
      type: Number,
      default: null
    },
    start_column: {
      type: Number,
      default: null
    },
    end_column: {
      type: Number,
      default: null
    }
  },
  message: {
    type: String,
    default: null
  },
  html_url: {
    type: String,
    default: null
  },
  created_at: {
    type: Date,
    required: true
  },
  updated_at: {
    type: Date,
    required: true
  },
  dismissed_at: {
    type: Date,
    default: null
  },
  dismissed_by: {
    type: String,
    default: null
  },
  dismissed_reason: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  autoIndex: false  // Disable automatic index building
});

alertSchema.index({ repository: 1, security_severity: 1 });
alertSchema.index({ rule_id: 1 });
alertSchema.index({ state: 1 });
alertSchema.index({ created_at: -1 });

module.exports = mongoose.model('Alert', alertSchema);

