import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';
import { authService } from './authService';
import { logger } from '../utils/logger';
import { eventBus } from '../utils/eventBus';

class DocumentService {
    constructor() {
        console.log('=== DocumentService Init ===');
        console.log('API_BASE_URL:', API_BASE_URL);

        this.api = axios.create({
            baseURL: API_BASE_URL,
            timeout: 60000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Request interceptor
        this.api.interceptors.request.use(
            (config) => {
                const token = authService.getToken();

                console.log('=== API REQUEST ===');
                console.log('URL:', config.url);
                console.log('Token exists:', !!token);

                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                } else {
                    console.log('❌ NO TOKEN');
                }

                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor
        this.api.interceptors.response.use(
            (response) => {
                console.log('=== API SUCCESS ===', response.config.url, response.status);
                return response;
            },
            (error) => {
                console.log('=== API ERROR ===', error.config?.url, error.response?.status);
                if (error.response?.status === 401) {
                    authService.clearTokens();
                    eventBus.emit('auth:logout');
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * Get documents with filters
     */
    async getDocuments(params = {}) {
        try {
            const response = await this.api.get(API_ENDPOINTS.DOCUMENTS.LIST, { params });
            logger.info(`Retrieved ${response.data.data?.documents?.length || 0} documents`);
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get documents:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get document by ID
     */
    async getDocument(documentId) {
        try {
            const response = await this.api.get(
                API_ENDPOINTS.DOCUMENTS.DETAIL.replace(':id', documentId)
            );
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get document:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Upload document
     */
    async uploadDocument(documentData, options = {}) {
        try {
            const formData = new FormData();

            Object.keys(documentData).forEach(key => {
                if (key === 'tags' && Array.isArray(documentData[key])) {
                    formData.append('tags', JSON.stringify(documentData[key]));
                } else if (key === 'metadata' && typeof documentData[key] === 'object') {
                    formData.append('metadata', JSON.stringify(documentData[key]));
                } else if (documentData[key] !== null && documentData[key] !== undefined) {
                    formData.append(key, documentData[key]);
                }
            });

            if (options.file) {
                formData.append('file', options.file);
            }

            const response = await this.api.post(API_ENDPOINTS.DOCUMENTS.UPLOAD, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    if (options.onProgress) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        options.onProgress(percentCompleted);
                    }
                }
            });

            logger.info('Document uploaded successfully');
            eventBus.emit('document:uploaded', response.data.data);
            return response.data.data;
        } catch (error) {
            logger.error('Failed to upload document:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ADDED: Analyze CSV file before upload
     */
    async analyzeCSV(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await this.api.post(
                '/api/documents/analyze-csv',
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 120000
                }
            );
            return response.data.data;
        } catch (error) {
            logger.error('CSV analysis failed:', error);
            throw this.handleError(error);
        }
    }

    /**
     * ADDED: Bulk upload CSV
     */
    async bulkUploadCSV(file, onProgress) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await this.api.post(
                '/api/documents/bulk-csv',
                formData,
                {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 300000,
                    onUploadProgress: (progressEvent) => {
                        if (onProgress && progressEvent.total) {
                            const percentCompleted = Math.round(
                                (progressEvent.loaded * 100) / progressEvent.total
                            );
                            onProgress(percentCompleted);
                        }
                    }
                }
            );
            return response.data.data;
        } catch (error) {
            logger.error('CSV bulk upload failed:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Update document
     */
    async updateDocument(documentId, updateData) {
        try {
            const response = await this.api.put(
                API_ENDPOINTS.DOCUMENTS.UPDATE.replace(':id', documentId),
                updateData
            );
            eventBus.emit('document:updated', response.data.data);
            return response.data.data;
        } catch (error) {
            logger.error('Failed to update document:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Delete document
     */
    async deleteDocument(documentId, softDelete = true) {
        try {
            const response = await this.api.delete(
                API_ENDPOINTS.DOCUMENTS.DELETE.replace(':id', documentId),
                { params: { soft: softDelete } }
            );
            eventBus.emit('document:deleted', documentId);
            return response.data;
        } catch (error) {
            logger.error('Failed to delete document:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Bulk delete documents
     */
    async bulkDeleteDocuments(documentIds) {
        try {
            const response = await this.api.post(API_ENDPOINTS.DOCUMENTS.BULK_DELETE, {
                documentIds
            });
            eventBus.emit('document:bulk_deleted', documentIds);
            return response.data;
        } catch (error) {
            logger.error('Failed to bulk delete documents:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Share document
     */
    async shareDocument(documentId, shareData) {
        try {
            const response = await this.api.post(
                API_ENDPOINTS.DOCUMENTS.SHARE.replace(':id', documentId),
                shareData
            );
            eventBus.emit('document:shared', { documentId, ...shareData });
            return response.data.data;
        } catch (error) {
            logger.error('Failed to share document:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Update document share
     */
    async updateDocumentShare(documentId, userId, permissions) {
        try {
            const response = await this.api.put(
                API_ENDPOINTS.DOCUMENTS.UPDATE_SHARE
                    .replace(':id', documentId)
                    .replace(':userId', userId),
                { permissions }
            );
            return response.data;
        } catch (error) {
            logger.error('Failed to update share:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Revoke document share
     */
    async revokeDocumentShare(documentId, userId) {
        try {
            const response = await this.api.delete(
                API_ENDPOINTS.DOCUMENTS.REVOKE_SHARE
                    .replace(':id', documentId)
                    .replace(':userId', userId)
            );
            eventBus.emit('document:share_revoked', { documentId, userId });
            return response.data;
        } catch (error) {
            logger.error('Failed to revoke share:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get document ACL
     */
    async getDocumentACL(documentId) {
        try {
            const response = await this.api.get(
                API_ENDPOINTS.DOCUMENTS.ACL.replace(':id', documentId)
            );
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get document ACL:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Download document
     */
    async downloadDocument(documentId) {
        try {
            const response = await this.api.get(
                API_ENDPOINTS.DOCUMENTS.DOWNLOAD.replace(':id', documentId),
                { responseType: 'blob' }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const contentDisposition = response.headers['content-disposition'];
            const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
            link.setAttribute('download', filenameMatch?.[1] || `document-${documentId}`);

            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            logger.error('Failed to download document:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Search documents
     */
    async searchDocuments(query, filters = {}) {
        try {
            const response = await this.api.get(API_ENDPOINTS.DOCUMENTS.SEARCH, {
                params: { q: query, ...filters }
            });
            return response.data.data;
        } catch (error) {
            logger.error('Failed to search documents:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get document statistics
     */
    async getDocumentStats() {
        try {
            const response = await this.api.get(API_ENDPOINTS.DOCUMENTS.STATS);
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get document stats:', error);
            return null;
        }
    }

    /**
     * Check document safety
     */
    async checkSafety(content) {
        try {
            const response = await this.api.post(API_ENDPOINTS.DOCUMENTS.SAFETY_CHECK, {
                text: content
            });
            return response.data;
        } catch (error) {
            logger.error('Safety check failed:', error);
            return {
                safe: false,
                reason: 'Safety check unavailable'
            };
        }
    }

    /**
     * Get document versions
     */
    async getDocumentVersions(documentId) {
        try {
            const response = await this.api.get(
                API_ENDPOINTS.DOCUMENTS.VERSIONS.replace(':id', documentId)
            );
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get document versions:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Search users for sharing
     */
    async searchUsers(query) {
        try {
            const response = await this.api.get(API_ENDPOINTS.USERS.SEARCH, {
                params: { q: query }
            });
            return response.data.data;
        } catch (error) {
            logger.error('Failed to search users:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Handle API errors
     */
    handleError(error) {
        if (error.response) {
            const { status, data } = error.response;

            switch (status) {
                case 400:
                    return new Error(data.message || 'Invalid request');
                case 401:
                    console.error('🔴 401 AUTH ERROR:', data);
                    return new Error(
                        data.message || data.code || 'Authentication failed.'
                    );
                case 403:
                    return new Error(data.message || 'Access denied');
                case 404:
                    return new Error(data.message || 'Document not found');
                case 413:
                    return new Error('File too large. Maximum size is 10MB.');
                case 429:
                    return new Error('Rate limit exceeded.');
                case 500:
                    return new Error(data.message || 'Server error');
                default:
                    return new Error(data.message || 'An error occurred');
            }
        } else if (error.request) {
            return new Error('Network error.');
        } else {
            return new Error(error.message || 'An error occurred');
        }
    }
}

export const documentService = new DocumentService();
export default documentService;