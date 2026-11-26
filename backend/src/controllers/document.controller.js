const Document = require('../models/Document');
const DocumentACL = require('../models/DocumentACL');
const User = require('../models/User');

// FIXED: Removed curly braces to match `module.exports = new Service()`
const documentService = require('../services/document.service');
const ragService = require('../services/rag.service');
const auditService = require('../services/audit.service');

const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const axios = require('axios');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

class DocumentController {
  /**
   * @desc    Upload a new document
   * @route   POST /api/documents
   * @access  Private
   */
  async uploadDocument(req, res) {
    try {
      let {
        title,
        content,
        department,
        classification,
        tags,
        fileType,
        metadata
      } = req.body;

      // ============================================
      // FIX: Parse JSON strings from FormData
      // ============================================
      if (typeof tags === 'string') {
        try {
          tags = JSON.parse(tags);
        } catch (e) {
          tags = tags.split(',').map(t => t.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(tags)) tags = [];

      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          metadata = {};
        }
      }
      if (typeof metadata !== 'object' || Array.isArray(metadata)) metadata = {};

      // Debug log
      console.log('=== Upload Request ===');
      console.log('Title:', title);
      console.log('Content length:', content?.length);
      console.log('Department:', department);
      console.log('Classification:', classification);
      console.log('Tags:', tags);
      console.log('Metadata keys:', Object.keys(metadata));

      // If content is empty but a file was uploaded, extract text from file
      if (req.file) {
        try {
          const rawBuf = fs.readFileSync(req.file.path);
          const ext = path.extname(req.file.originalname).toLowerCase();
          let extractedText = '';

          if (['.txt', '.md', '.json', '.html', '.csv'].includes(ext)) {
            extractedText = rawBuf.toString('utf8');
            fileType = ext.replace('.', '');
          } else if (ext === '.pdf') {
            try {
              const pdfResult = await pdfParse(rawBuf);
              extractedText = pdfResult.text || '';
              fileType = 'pdf';
              console.log(`Extracted ${extractedText.length} chars from PDF: ${req.file.originalname}`);
            } catch (pdfErr) {
              console.error('PDF parsing error:', pdfErr.message);
            }
          } else if (['.docx', '.doc'].includes(ext)) {
            try {
              const mammothResult = await mammoth.extractRawText({ buffer: rawBuf });
              extractedText = mammothResult.value || '';
              fileType = ext.replace('.', '');
              console.log(`Extracted ${extractedText.length} chars from Word doc via mammoth: ${req.file.originalname}`);
            } catch (docErr) {
              console.warn('Mammoth extraction failed (e.g. legacy binary .doc format):', docErr.message);
              // Fallback for legacy binary .doc or plain text wrapped in .doc: extract ASCII printable sequences
              const cleanStr = rawBuf.toString('binary').replace(/[^\x20-\x7E\t\r\n]+/g, ' ');
              const cleaned = cleanStr.replace(/\s+/g, ' ').trim();
              if (cleaned.length > 50) {
                extractedText = cleaned;
                fileType = ext.replace('.', '');
                console.log(`Recovered ${extractedText.length} chars from binary doc fallback: ${req.file.originalname}`);
              }
            }
          }

          // If extractedText found, use it unless user explicitly provided custom content
          if (extractedText && extractedText.trim().length > 0) {
            // Clean up excessive whitespace
            content = extractedText.trim();
          } else if (!content || content.trim().length === 0) {
            content = `Document: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB)`;
          }
        } catch (e) {
          console.error('File parsing error:', e);
          if (!content) content = `Document: ${req.file.originalname}`;
        }
      }

      // Validate required fields
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: 'Title and content are required'
        });
      }

      // Check classification validity
      const validClassifications = ['public', 'internal', 'confidential', 'restricted'];
      if (classification && !validClassifications.includes(classification)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid classification level',
          validValues: validClassifications
        });
      }

      // Check user clearance for classification
      const clearanceLevels = ['public', 'internal', 'confidential', 'restricted'];
      const userClearanceIndex = clearanceLevels.indexOf(req.user.securityClearance);
      const docClassificationIndex = clearanceLevels.indexOf(classification || 'internal');

      if (userClearanceIndex < docClassificationIndex) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient clearance to upload document at this classification level'
        });
      }

      // Check for duplicate document (by title or content hash)
      const contentHash = documentService.generateContentHash(content);
      const existingDoc = await Document.findOne({
        $or: [
          { contentHash },
          { title: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }
        ]
      });

      if (existingDoc) {
        const isSameContent = existingDoc.contentHash === contentHash;
        const msg = isSameContent
          ? `Document already exists with identical content (Title: "${existingDoc.title}")`
          : `A document with the title "${title}" already exists in the system`;
        logger.warn(`Duplicate document upload blocked: ${msg}`);
        return res.status(409).json({
          success: false,
          code: 'DOCUMENT_ALREADY_EXISTS',
          message: msg,
          existingDocument: {
            id: existingDoc._id,
            title: existingDoc.title,
            classification: existingDoc.classification
          }
        });
      }

      // Process document (encrypt content and embeddings)
      const processedDocument = await documentService.processDocument({
        title,
        content,
        department: department || req.user.department,
        classification: classification || 'internal',
        tags: tags || [],
        fileType: fileType || 'txt',
        metadata: metadata || {}
      });

      // Create document record
      const document = new Document({
        ...processedDocument,
        owner: req.user._id,
        metadata: {
          ...processedDocument.metadata,
          uploadedBy: req.user._id,
          uploadedAt: new Date().toISOString(),
          originalFilename: req.file?.originalname || null
        }
      });

      await document.save();

      // Add to RAG system for retrieval
      try {
        await ragService.addDocument(document);
      } catch (ragError) {
        logger.error('Failed to add document to RAG:', ragError);
      }

      // Audit log
      try {
        await auditService.logEvent({
          userId: req.user._id,
          username: req.user.username,
          action: 'DOCUMENT_CREATE',
          resourceType: 'document',
          resourceId: document._id,
          details: {
            title: document.title,
            classification: document.classification,
            department: document.department
          },
          status: 'success'
        });
      } catch (auditError) {
        logger.warn('Audit log failed:', auditError.message);
      }

      logger.info(`Document uploaded: ${title} by ${req.user.username}`);

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: {
          id: document._id,
          title: document.title,
          classification: document.classification,
          department: document.department,
          version: document.version,
          createdAt: document.createdAt,
          fileType: document.fileType,
          tags: document.tags
        }
      });
    } catch (error) {
      logger.error('Document upload error:', error);
      console.error('Upload error details:', {
        message: error.message,
        name: error.name
      });
      res.status(500).json({
        success: false,
        message: 'Failed to upload document',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * @desc    Check content safety before upload
   * @route   POST /api/documents/safety-check
   * @access  Private
   */
  async checkSafety(req, res) {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'Text is required for safety check'
        });
      }

      try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const response = await axios.post(
          `${aiServiceUrl}/safety/check`,
          { text },
          { timeout: 10000 }
        );

        logger.info(`Safety check completed for: ${text.substring(0, 50)}...`);

        return res.status(200).json({
          success: true,
          safe: response.data.safe !== false,
          score: response.data.score || 0.9,
          reason: response.data.reason || 'Content passed safety check',
          category: response.data.category || 'safe'
        });
      } catch (aiError) {
        logger.warn('AI service unavailable, using fallback:', aiError.message);

        const unsafePatterns = [
          { pattern: /password\s*[:=]\s*\S+/i, reason: 'Contains hardcoded password' },
          { pattern: /api[_-]?key\s*[:=]\s*\S+/i, reason: 'Contains hardcoded API key' },
          { pattern: /secret\s*[:=]\s*\S+/i, reason: 'Contains hardcoded secret' },
          { pattern: /\b\d{3}-\d{2}-\d{4}\b/, reason: 'Contains SSN pattern' }
        ];

        const triggered = unsafePatterns.filter(p => p.pattern.test(text));

        if (triggered.length > 0) {
          return res.status(200).json({
            success: true,
            safe: false,
            score: 0.3,
            reason: triggered[0].reason,
            category: 'sensitive'
          });
        }

        return res.status(200).json({
          success: true,
          safe: true,
          score: 0.9,
          reason: 'Content passed basic safety check',
          category: 'safe'
        });
      }
    } catch (error) {
      logger.error('Safety check error:', error);
      res.status(500).json({
        success: false,
        message: 'Safety check failed'
      });
    }
  }

  /**
   * @desc    Bulk upload documents from CSV
   * @route   POST /api/documents/bulk-csv
   * @access  Private
   */
  async bulkUploadCSV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'CSV file is required' });
      }

      const results = [];
      const errors = [];
      const uploaded = [];

      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

      if (results.length === 0) {
        return res.status(400).json({ success: false, message: 'CSV file is empty' });
      }

      const clearanceLevels = ['public', 'internal', 'confidential', 'restricted'];
      const userClearanceIndex = clearanceLevels.indexOf(req.user.securityClearance);

      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const rowNum = i + 2;

        try {
          if (!row.title || !row.content) {
            errors.push({ row: rowNum, error: 'Missing title or content' });
            continue;
          }

          const rowClassification = row.classification || 'internal';
          const docClassificationIndex = clearanceLevels.indexOf(rowClassification);

          if (docClassificationIndex === -1) {
            errors.push({ row: rowNum, error: `Invalid classification: ${rowClassification}` });
            continue;
          }

          if (userClearanceIndex < docClassificationIndex) {
            errors.push({ row: rowNum, error: `Insufficient clearance for: ${rowClassification}` });
            continue;
          }

          let tags = [];
          if (row.tags) {
            tags = row.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
          }

          const processedDocument = await documentService.processDocument({
            title: row.title,
            content: row.content,
            department: row.department || req.user.department,
            classification: rowClassification,
            tags: tags,
            fileType: row.fileType || 'txt',
            metadata: {
              importedFrom: 'csv',
              csvRow: rowNum,
              importedAt: new Date().toISOString()
            }
          });

          const document = new Document({
            ...processedDocument,
            owner: req.user._id
          });

          await document.save();

          try {
            await ragService.addDocument(document);
          } catch (ragError) {
            logger.warn(`RAG indexing failed for row ${rowNum}:`, ragError.message);
          }

          uploaded.push({
            row: rowNum,
            id: document._id.toString(),
            title: document.title
          });
        } catch (rowError) {
          logger.error(`Error processing row ${rowNum}:`, rowError);
          errors.push({ row: rowNum, error: rowError.message });
        }
      }

      res.status(200).json({
        success: true,
        message: `Processed ${results.length} rows: ${uploaded.length} uploaded, ${errors.length} failed`,
        data: {
          total: results.length,
          uploaded: uploaded.length,
          failed: errors.length,
          uploadedDocuments: uploaded,
          errors: errors,
          analysis: {
            hasErrors: errors.length > 0,
            successRate: ((uploaded.length / results.length) * 100).toFixed(1) + '%'
          }
        }
      });
    } catch (error) {
      logger.error('CSV bulk upload error:', error);
      res.status(500).json({ success: false, message: 'CSV upload failed' });
    }
  }

  /**
   * @desc    AI analyze CSV before upload
   * @route   POST /api/documents/analyze-csv
   * @access  Private
   */
  async analyzeCSV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'CSV file is required' });
      }

      const results = [];

      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

      if (results.length === 0) {
        return res.status(400).json({ success: false, message: 'CSV file is empty' });
      }

      const columns = Object.keys(results[0]);
      const totalRows = results.length;
      const sample = results.slice(0, 5);

      const analysis = {
        columns,
        totalRows,
        requiredColumns: {
          title: columns.includes('title'),
          content: columns.includes('content')
        },
        optionalColumns: {
          department: columns.includes('department'),
          classification: columns.includes('classification'),
          tags: columns.includes('tags'),
          fileType: columns.includes('fileType')
        },
        suggestions: [],
        preview: sample
      };

      if (!analysis.requiredColumns.title) {
        analysis.suggestions.push('❌ Missing required column: title');
      }
      if (!analysis.requiredColumns.content) {
        analysis.suggestions.push('❌ Missing required column: content');
      }
      if (!analysis.optionalColumns.department) {
        analysis.suggestions.push('💡 Consider adding "department" column');
      }
      if (!analysis.optionalColumns.classification) {
        analysis.suggestions.push('💡 Consider adding "classification" column');
      }
      if (!analysis.optionalColumns.tags) {
        analysis.suggestions.push('💡 Consider adding "tags" column');
      }

      // Sample safety check on first 5 rows
      const safetyResults = [];
      try {
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        for (let i = 0; i < Math.min(5, results.length); i++) {
          const row = results[i];
          if (row.content) {
            try {
              const response = await axios.post(
                `${aiServiceUrl}/safety/check`,
                { text: row.content },
                { timeout: 5000 }
              );
              safetyResults.push({
                row: i + 2,
                safe: response.data.safe !== false,
                score: response.data.score || 0.9,
                reason: response.data.reason || ''
              });
            } catch (e) { /* skip */ }
          }
        }
      } catch (aiError) {
        logger.warn('AI analysis unavailable');
      }

      analysis.safetySample = safetyResults;
      analysis.safeCount = safetyResults.filter(r => r.safe).length;
      analysis.unsafeCount = safetyResults.filter(r => !r.safe).length;

      if (analysis.unsafeCount > 0) {
        analysis.suggestions.push(`⚠️ ${analysis.unsafeCount} rows contain unsafe content`);
      }

      res.status(200).json({ success: true, data: analysis });
    } catch (error) {
      logger.error('CSV analysis error:', error);
      res.status(500).json({ success: false, message: 'CSV analysis failed' });
    }
  }

  /**
   * @desc    Get document by ID
   * @route   GET /api/documents/:documentId
   * @access  Private
   */
  async getDocument(req, res) {
    try {
      const document = req.document;

      if (!document) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      let decryptedContent = null;
      try {
        decryptedContent = await documentService.decryptDocumentContent(
          document.encryptedContent,
          req.user._id
        );
      } catch (decryptError) {
        logger.error('Failed to decrypt document:', decryptError);
      }

      const acl = await DocumentACL.findOne({
        document: document._id,
        user: req.user._id,
        isActive: true
      });

      res.status(200).json({
        success: true,
        data: {
          id: document._id.toString(),
          _id: document._id.toString(),
          title: document.title,
          content: decryptedContent || document.content || '',
          fileSize: document.fileSize,
          department: document.department,
          classification: document.classification,
          tags: document.tags,
          fileType: document.fileType,
          version: document.version,
          status: document.status,
          owner: document.owner,
          permissions: acl?.permissions || ['read'],
          metadata: document.metadata,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          safetyScore: document.safetyScore,
          isSafetyClassified: document.isSafetyClassified
        }
      });
    } catch (error) {
      logger.error('Get document error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve document' });
    }
  }

  /**
   * @desc    List documents with filters
   * @route   GET /api/documents
   * @access  Private
   */
  async listDocuments(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        department,
        classification,
        tags,
        owner,
        status,
        favorite,
        tab,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filter = {};
      if (status) {
        filter.status = status;
      } else if (tab === 'archived') {
        filter.status = 'archived';
      } else {
        // By default, exclude archived and deleted from main views
        filter.status = { $nin: ['deleted', 'archived'] };
      }

      // Tab specific filters
      if (tab === 'my') {
        filter.owner = req.user._id;
      } else if (tab === 'favorites') {
        filter['metadata.favorites'] = req.user._id.toString();
      }

      if (favorite === 'true') {
        filter['metadata.favorites'] = req.user._id.toString();
      }
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (department) filter.department = department;
      if (classification) filter.classification = classification;
      if (owner) filter.owner = owner;
      if (tags) {
        filter.tags = { $in: Array.isArray(tags) ? tags : tags.split(',') };
      }

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { 'metadata.description': { $regex: search, $options: 'i' } }
        ];
      }

      // Access control
      if (req.user.role.name !== 'admin') {
        const accessFilter = {
          $or: [
            { owner: req.user._id },
            {
              $and: [
                { department: req.user.department },
                { classification: { $in: ['public', 'internal'] } }
              ]
            },
            { classification: 'public' }
          ]
        };

        if (filter.$or) {
          filter.$and = [{ $or: filter.$or }, accessFilter];
          delete filter.$or;
        } else {
          Object.assign(filter, accessFilter);
        }
      }

      // ACL access
      const aclDocumentIds = await DocumentACL.find({
        user: req.user._id,
        isActive: true,
        $or: [
          { expiresAt: { $gt: new Date() } },
          { expiresAt: null }
        ]
      }).distinct('document');

      if (aclDocumentIds.length > 0) {
        if (filter.$or) {
          filter.$or.push({ _id: { $in: aclDocumentIds } });
        } else {
          filter.$or = [{ _id: { $in: aclDocumentIds } }];
        }
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const documents = await Document.find(filter)
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('owner', 'username fullName email')
        .select('-encryptedContent -encryptedEmbedding')
        .lean();

      const total = await Document.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: {
          documents: documents.map(doc => ({
            ...doc,
            id: doc._id.toString(),
            _id: doc._id.toString()
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
            hasNext: pageNum < Math.ceil(total / limitNum),
            hasPrev: pageNum > 1
          }
        }
      });
    } catch (error) {
      logger.error('List documents error:', error);
      res.status(500).json({ success: false, message: 'Failed to list documents' });
    }
  }

  /**
   * @desc    Get document statistics
   * @route   GET /api/documents/stats
   * @access  Private
   */
  async getDocumentStats(req, res) {
    try {
      const baseFilter = { status: { $ne: 'deleted' } };
      const totalDocuments = await Document.countDocuments(baseFilter);
      const confidentialCount = await Document.countDocuments({ ...baseFilter, classification: 'confidential' });
      const restrictedCount = await Document.countDocuments({ ...baseFilter, classification: 'restricted' });
      const internalCount = await Document.countDocuments({ ...baseFilter, classification: 'internal' });
      const publicCount = await Document.countDocuments({ ...baseFilter, classification: 'public' });

      const sizeAgg = await Document.aggregate([
        { $match: { status: { $ne: 'deleted' } } },
        { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
      ]);
      const totalSize = sizeAgg[0]?.totalSize || 0;

      const byDepartment = await Document.aggregate([
        { $match: { status: { $ne: 'deleted' } } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalDocuments,
          confidentialCount,
          restrictedCount,
          internalCount,
          publicCount,
          totalSize,
          byDepartment
        }
      });
    } catch (error) {
      logger.error('Get document stats error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch document stats' });
    }
  }

  /**
   * @desc    Update document
   * @route   PUT /api/documents/:documentId
   * @access  Private
   */
  async updateDocument(req, res) {
    try {
      const document = req.document;
      const { title, content, department, classification, tags, metadata } = req.body;

      if (title) document.title = title;
      if (department) document.department = department;
      if (tags) document.tags = tags;

      if (classification && classification !== document.classification) {
        const clearanceLevels = ['public', 'internal', 'confidential', 'restricted'];
        const userClearanceIndex = clearanceLevels.indexOf(req.user.securityClearance);
        const newClassificationIndex = clearanceLevels.indexOf(classification);

        if (userClearanceIndex < newClassificationIndex) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient clearance to update to this classification level'
          });
        }
        document.classification = classification;
      }

      if (content) {
        const processed = await documentService.processDocument({
          content,
          department: document.department,
          classification: document.classification,
          tags: document.tags
        });

        document.encryptedContent = processed.encryptedContent;
        document.encryptedEmbedding = processed.encryptedEmbedding;
        document.contentHash = processed.contentHash;
        document.vectorId = processed.vectorId;
        document.version += 1;
        document.content = content;
      }

      if (metadata) {
        document.metadata = {
          ...document.metadata,
          ...metadata,
          lastModifiedBy: req.user._id,
          lastModifiedAt: new Date().toISOString()
        };
      }

      await document.save();

      if (content) {
        try {
          await ragService.updateDocument(document);
        } catch (ragError) {
          logger.error('Failed to update document in RAG:', ragError);
        }
      }

      logger.info(`Document updated: ${document.title} by ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'Document updated successfully',
        data: {
          id: document._id,
          title: document.title,
          version: document.version,
          classification: document.classification,
          updatedAt: document.updatedAt
        }
      });
    } catch (error) {
      logger.error('Update document error:', error);
      res.status(500).json({ success: false, message: 'Failed to update document' });
    }
  }

  /**
   * @desc    Delete document
   * @route   DELETE /api/documents/:documentId
   * @access  Private
   */
  async deleteDocument(req, res) {
    try {
      const document = req.document;

      try {
        await ragService.deleteDocument(document._id);
      } catch (ragError) {
        logger.error('Failed to delete document from RAG:', ragError);
      }

      await DocumentACL.deleteMany({ document: document._id });

      if (req.query.soft === 'true') {
        document.status = 'deleted';
        document.metadata = {
          ...document.metadata,
          deletedBy: req.user._id,
          deletedAt: new Date().toISOString()
        };
        await document.save();
      } else {
        await document.deleteOne();
      }

      logger.info(`Document deleted: ${document.title} by ${req.user.username}`);

      res.status(200).json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
      logger.error('Delete document error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
  }

  /**
   * @desc    Share document with another user
   * @route   POST /api/documents/:documentId/share
   * @access  Private
   */
  async shareDocument(req, res) {
    try {
      const document = req.document;
      const { userId, permissions = ['read'], expiresAt } = req.body;

      const validPermissions = ['read', 'write', 'delete', 'share', 'download'];
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid permissions',
          invalidPermissions,
          validPermissions
        });
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const clearanceLevels = ['public', 'internal', 'confidential', 'restricted'];
      const targetClearance = clearanceLevels.indexOf(targetUser.securityClearance);
      const docClassification = clearanceLevels.indexOf(document.classification);

      if (targetClearance < docClassification) {
        return res.status(403).json({
          success: false,
          message: 'Target user does not have sufficient clearance for this document'
        });
      }

      let acl = await DocumentACL.findOne({
        document: document._id,
        user: userId
      });

      if (acl) {
        acl.permissions = permissions;
        acl.expiresAt = expiresAt || null;
        acl.grantedBy = req.user._id;
        acl.grantedAt = new Date();
        acl.isActive = true;
      } else {
        acl = new DocumentACL({
          document: document._id,
          user: userId,
          permissions,
          expiresAt: expiresAt || null,
          grantedBy: req.user._id,
          grantedAt: new Date(),
          isActive: true
        });
      }

      await acl.save();

      logger.info(`Document shared: ${document.title} with ${targetUser.username} by ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: 'Document shared successfully',
        data: {
          documentId: document._id,
          userId,
          permissions,
          expiresAt: expiresAt || null,
          sharedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Share document error:', error);
      res.status(500).json({ success: false, message: 'Failed to share document' });
    }
  }

  /**
   * @desc    Remove document share
   * @route   DELETE /api/documents/:documentId/share/:userId
   * @access  Private
   */
  async removeShare(req, res) {
    try {
      const document = req.document;
      const { userId } = req.params;

      const acl = await DocumentACL.findOneAndDelete({
        document: document._id,
        user: userId
      });

      if (!acl) {
        return res.status(404).json({ success: false, message: 'Share not found' });
      }

      logger.info(`Document share removed: ${document.title} from user ${userId} by ${req.user.username}`);

      res.status(200).json({ success: true, message: 'Document share removed successfully' });
    } catch (error) {
      logger.error('Remove share error:', error);
      res.status(500).json({ success: false, message: 'Failed to remove share' });
    }
  }

  /**
   * @desc    Get document ACL
   * @route   GET /api/documents/:documentId/acl
   * @access  Private
   */
  async getDocumentACL(req, res) {
    try {
      const document = req.document;

      const aclEntries = await DocumentACL.find({
        document: document._id,
        isActive: true
      }).populate('user', 'username email fullName')
        .populate('grantedBy', 'username fullName');

      res.status(200).json({
        success: true,
        data: {
          documentId: document._id,
          documentTitle: document.title,
          owner: {
            id: document.owner._id,
            name: document.owner.fullName
          },
          shares: aclEntries
        }
      });
    } catch (error) {
      logger.error('Get ACL error:', error);
      res.status(500).json({ success: false, message: 'Failed to get document ACL' });
    }
  }

  /**
   * @desc    Get document version history
   * @route   GET /api/documents/:documentId/versions
   * @access  Private
   */
  async getVersionHistory(req, res) {
    try {
      const document = req.document;

      res.status(200).json({
        success: true,
        data: {
          documentId: document._id,
          currentVersion: document.version,
          history: [
            {
              version: document.version,
              modifiedBy: document.owner,
              modifiedAt: document.updatedAt,
              changes: 'Current version'
            }
          ]
        }
      });
    } catch (error) {
      logger.error('Get version history error:', error);
      res.status(500).json({ success: false, message: 'Failed to get version history' });
    }
  }

  /**
   * @desc    Download document content
   * @route   GET /api/documents/:documentId/download
   * @access  Private
   */
  async downloadDocument(req, res) {
    try {
      const document = req.document;

      let content = document.content;
      if (!content && document.encryptedContent) {
        content = await documentService.decryptDocumentContent(
          document.encryptedContent,
          req.user._id
        );
      }

      const filename = document.metadata?.originalFilename || `${document.title}.${document.fileType || 'txt'}`;
      const mimeType = document.mimeType || 'text/plain';

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Type', mimeType);

      return res.status(200).send(content || '');
    } catch (error) {
      logger.error('Download document error:', error);
      res.status(500).json({ success: false, message: 'Failed to download document' });
    }
  }

  /**
   * @desc    Batch delete documents
   * @route   POST /api/documents/batch/delete
   * @access  Private (Admin)
   */
  async batchDeleteDocuments(req, res) {
    try {
      const { documentIds } = req.body;

      for (const id of documentIds) {
        try { await ragService.deleteDocument(id); } catch (e) { /* ignore */ }
      }

      await DocumentACL.deleteMany({ document: { $in: documentIds } });
      const result = await Document.deleteMany({ _id: { $in: documentIds } });

      logger.info(`Batch deleted ${result.deletedCount} documents by ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} documents`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      logger.error('Batch delete documents error:', error);
      res.status(500).json({ success: false, message: 'Failed to batch delete documents' });
    }
  }

  /**
   * @desc    Batch update classification
   * @route   POST /api/documents/batch/update-classification
   * @access  Private (Admin)
   */
  async batchUpdateClassification(req, res) {
    try {
      const { documentIds, classification } = req.body;

      const result = await Document.updateMany(
        { _id: { $in: documentIds } },
        {
          $set: {
            classification,
            'metadata.lastModifiedBy': req.user._id,
            'metadata.lastModifiedAt': new Date().toISOString()
          }
        }
      );

      logger.info(`Batch updated classification to ${classification} for ${result.modifiedCount} documents by ${req.user.username}`);

      res.status(200).json({
        success: true,
        message: `Successfully updated classification for ${result.modifiedCount} documents`,
        modifiedCount: result.modifiedCount
      });
    } catch (error) {
      logger.error('Batch update classification error:', error);
      res.status(500).json({ success: false, message: 'Failed to batch update classification' });
    }
  }

  /**
   * @desc    Toggle archive status of a document
   * @route   POST /api/documents/:documentId/archive
   * @access  Private
   */
  async toggleArchive(req, res) {
    try {
      const document = req.document;
      const isArchived = document.status === 'archived';
      document.status = isArchived ? 'published' : 'archived';
      document.metadata = {
        ...document.metadata,
        archivedAt: isArchived ? null : new Date().toISOString(),
        archivedBy: isArchived ? null : req.user._id
      };
      await document.save();

      res.status(200).json({
        success: true,
        message: isArchived ? 'Document unarchived successfully' : 'Document archived successfully',
        data: {
          id: document._id.toString(),
          status: document.status
        }
      });
    } catch (error) {
      logger.error('Toggle archive error:', error);
      res.status(500).json({ success: false, message: 'Failed to update archive status' });
    }
  }

  /**
   * @desc    Toggle favorite status of a document for current user
   * @route   POST /api/documents/:documentId/favorite
   * @access  Private
   */
  async toggleFavorite(req, res) {
    try {
      const document = req.document;
      const userId = req.user._id.toString();
      const currentFavorites = Array.isArray(document.metadata?.favorites) 
        ? document.metadata.favorites 
        : [];

      const isFav = currentFavorites.includes(userId);
      let updatedFavorites;
      if (isFav) {
        updatedFavorites = currentFavorites.filter(id => id !== userId);
      } else {
        updatedFavorites = [...currentFavorites, userId];
      }

      document.metadata = {
        ...document.metadata,
        favorites: updatedFavorites
      };
      document.markModified('metadata');
      await document.save();

      res.status(200).json({
        success: true,
        message: isFav ? 'Removed from favorites' : 'Added to favorites',
        data: {
          id: document._id.toString(),
          isFavorite: !isFav
        }
      });
    } catch (error) {
      logger.error('Toggle favorite error:', error);
      res.status(500).json({ success: false, message: 'Failed to update favorite status' });
    }
  }
}

module.exports = new DocumentController();
