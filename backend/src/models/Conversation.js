const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['system', 'user', 'assistant', 'tool'],
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  citations: {
    type: Array,
    default: []
  },
  sources: {
    type: Array,
    default: []
  },
  feedback: {
    type: Number,
    min: 1,
    max: 5
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      default: 'New Conversation',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    messages: [messageSchema],
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => ({})
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.index({ userId: 1, updatedAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
