const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true
    },
    content: {
      type: String
    },
    contentHash: {
      type: String,
      required: true,
      index: true
    },
    encryptedContent: {
      type: String,
      required: true
    },
    encryptionKeyId: {
      type: String,
      required: true
    },
    encryptedEmbedding: {
      type: String,
      required: true
    },
    embeddingKeyId: {
      type: String,
      required: true
    },
    vectorId: {
      type: String,
      required: true,
      unique: true
    },
    embeddingModel: {
      type: String,
      default: 'sentence-transformers/all-MiniLM-L6-v2'
    },
    fileType: {
      type: String,
      default: 'txt'
    },
    fileSize: {
      type: Number,
      default: 0
    },
    mimeType: {
      type: String,
      default: 'text/plain'
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    department: {
      type: String,
      required: true
    },
    classification: {
      type: String,
      enum: ['public', 'internal', 'confidential', 'restricted'],
      default: 'internal'
    },
    tags: {
      type: [String],
      default: []
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    version: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived', 'deleted'],
      default: 'published'
    },
    safetyScore: {
      type: Number,
      default: 0
    },
    isSafetyClassified: {
      type: Boolean,
      default: false
    },
    lastAccessedAt: {
      type: Date
    },
    accessCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;

