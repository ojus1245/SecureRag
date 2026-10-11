/**
 * Delete ALL documents from MongoDB and reset the RAG vector store.
 * Run: node src/scripts/clearDocuments.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const config = require('../config/config');
const Document = require('../models/Document');
const DocumentACL = require('../models/DocumentACL');
const logger = require('../utils/logger');

async function main() {
    try {
        // 1. Connect to MongoDB
        await mongoose.connect(config.mongodb.uri);
        logger.info('✅ Connected to MongoDB');

        // 2. Delete every Document and every DocumentACL entry
        const docCount = await Document.countDocuments();
        logger.info(`Found ${docCount} documents in MongoDB`);

        const docResult = await Document.deleteMany({});
        const aclResult = await DocumentACL.deleteMany({});
        logger.info(`🗑️  Deleted ${docResult.deletedCount} documents and ${aclResult.deletedCount} ACL entries`);

        // 3. Tell the AI service to clear its vector store
        const aiUrl = config.aiService.url;
        try {
            const list = await axios.get(`${aiUrl}/rag/documents`);
            const docs = list.data.documents || [];
            logger.info(`AI service has ${docs.length} documents in its vector store`);

            for (const d of docs) {
                try {
                    await axios.delete(`${aiUrl}/rag/documents/${d.documentId}`);
                } catch (err) {
                    logger.warn(`Failed to delete ${d.documentId} from AI store: ${err.message}`);
                }
            }
            logger.info('✅ AI service vector store cleared');
        } catch (err) {
            logger.warn(`Could not clear AI service store (may be offline): ${err.message}`);
        }
    } catch (err) {
        logger.error('Clear failed:', err);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

main();