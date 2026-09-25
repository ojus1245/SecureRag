import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchDocuments,
    fetchDocument,
    uploadDocument,
    updateDocument,
    deleteDocument,
    bulkDeleteDocuments,
    shareDocument,
    revokeDocumentShare,
    fetchDocumentACL,
    downloadDocument,
    searchDocuments,
    fetchDocumentStats,
    fetchDocumentVersions,
    setSelectedDocument,
    clearSelectedDocument,
    setUploadProgress,
    setFilters,
    setPagination,
    clearFilters,
    setError,
    clearError,
    selectDocuments,
    selectDocumentList,
    selectSelectedDocument,
    selectIsLoading,
    selectIsUploading,
    selectIsDeleting,
    selectError,
    selectUploadProgress,
    selectPagination,
    selectFilters,
    selectStats,
    selectACL,
    selectFilteredDocuments
} from '../store/documentSlice';
import { documentService } from '../services/documentService';
import { logger } from '../utils/logger';

export const useDocuments = () => {
    const dispatch = useDispatch();

    const documents = useSelector(selectDocuments);
    const documentList = useSelector(selectDocumentList);
    const selectedDocument = useSelector(selectSelectedDocument);
    const isLoading = useSelector(selectIsLoading);
    const isUploading = useSelector(selectIsUploading);
    const isDeleting = useSelector(selectIsDeleting);
    const error = useSelector(selectError);
    const uploadProgress = useSelector(selectUploadProgress);
    const pagination = useSelector(selectPagination);
    const filters = useSelector(selectFilters);
    const stats = useSelector(selectStats);
    const acl = useSelector(selectACL);
    const filteredDocuments = useSelector(selectFilteredDocuments);

    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef(null);

    // Load documents on mount
    useEffect(() => {
        loadDocuments();
        loadStats();
    }, []);

    // Load documents when filters or pagination change
    useEffect(() => {
        loadDocuments();
    }, [filters, pagination.page, pagination.limit]);

    // Load documents handler
    const loadDocuments = useCallback(async (params = {}) => {
        try {
            const result = await dispatch(fetchDocuments(params)).unwrap();
            return result;
        } catch (error) {
            logger.error('Failed to load documents:', error);
            throw error;
        }
    }, [dispatch]);

    // Load single document
    const loadDocument = useCallback(async (documentId) => {
        try {
            const result = await dispatch(fetchDocument(documentId)).unwrap();
            return result;
        } catch (error) {
            logger.error('Failed to load document:', error);
            throw error;
        }
    }, [dispatch]);

    // Upload document handler
    const handleUploadDocument = useCallback(async (documentData, file, onProgress) => {
        try {
            const result = await dispatch(uploadDocument({
                documentData,
                file,
                onProgress
            })).unwrap();

            return result;
        } catch (error) {
            logger.error('Failed to upload document:', error);
            throw error;
        }
    }, [dispatch]);

    // Update document handler
    const handleUpdateDocument = useCallback(async (documentId, updateData) => {
        try {
            const result = await dispatch(updateDocument({
                documentId,
                updateData
            })).unwrap();

            return result;
        } catch (error) {
            logger.error('Failed to update document:', error);
            throw error;
        }
    }, [dispatch]);

    // Delete document handler
    const handleDeleteDocument = useCallback(async (documentId, softDelete = true) => {
        try {
            await dispatch(deleteDocument({ documentId, softDelete })).unwrap();
            return true;
        } catch (error) {
            logger.error('Failed to delete document:', error);
            throw error;
        }
    }, [dispatch]);

    // Bulk delete handler
    const handleBulkDelete = useCallback(async (documentIds) => {
        try {
            await dispatch(bulkDeleteDocuments(documentIds)).unwrap();
            return true;
        } catch (error) {
            logger.error('Failed to bulk delete:', error);
            throw error;
        }
    }, [dispatch]);

    // Share document handler
    const handleShareDocument = useCallback(async (documentId, shareData) => {
        try {
            const result = await dispatch(shareDocument({
                documentId,
                shareData
            })).unwrap();

            return result;
        } catch (error) {
            logger.error('Failed to share document:', error);
            throw error;
        }
    }, [dispatch]);

    // Revoke share handler
    const handleRevokeShare = useCallback(async (documentId, userId) => {
        try {
            await dispatch(revokeDocumentShare({ documentId, userId })).unwrap();
            return true;
        } catch (error) {
            logger.error('Failed to revoke share:', error);
            throw error;
        }
    }, [dispatch]);

    // Load ACL handler
    const loadACL = useCallback(async (documentId) => {
        try {
            const result = await dispatch(fetchDocumentACL(documentId)).unwrap();
            return result;
        } catch (error) {
            logger.error('Failed to load ACL:', error);
            throw error;
        }
    }, [dispatch]);

    // Download document handler
    const handleDownloadDocument = useCallback(async (documentId) => {
        try {
            await dispatch(downloadDocument(documentId)).unwrap();
            return true;
        } catch (error) {
            logger.error('Failed to download document:', error);
            throw error;
        }
    }, [dispatch]);

    // Search documents handler
    const handleSearchDocuments = useCallback(async (query, searchFilters = {}) => {
        setIsSearching(true);

        try {
            // Clear previous timeout
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }

            // Debounce search
            return new Promise((resolve, reject) => {
                searchTimeoutRef.current = setTimeout(async () => {
                    try {
                        const result = await dispatch(searchDocuments({
                            query,
                            filters: searchFilters
                        })).unwrap();

                        setSearchResults(result.documents || []);
                        setIsSearching(false);
                        resolve(result);
                    } catch (error) {
                        setIsSearching(false);
                        reject(error);
                    }
                }, 300);
            });
        } catch (error) {
            logger.error('Failed to search documents:', error);
            setIsSearching(false);
            throw error;
        }
    }, [dispatch]);

    // Load stats handler
    const loadStats = useCallback(async () => {
        try {
            const result = await dispatch(fetchDocumentStats()).unwrap();
            return result;
        } catch (error) {
            logger.error('Failed to load stats:', error);
        }
    }, [dispatch]);

    // Load versions handler
    const loadVersions = useCallback(async (documentId) => {
        try {
            const result = await dispatch(fetchDocumentVersions(documentId)).unwrap();
            return result;
        } catch (error) {
            logger.error('Failed to load versions:', error);
            throw error;
        }
    }, [dispatch]);

    // Select document handler
    const handleSelectDocument = useCallback((document) => {
        dispatch(setSelectedDocument(document));
    }, [dispatch]);

    // Clear selected document
    const handleClearSelected = useCallback(() => {
        dispatch(clearSelectedDocument());
    }, [dispatch]);

    // Update filters handler
    const handleUpdateFilters = useCallback((newFilters) => {
        dispatch(setFilters(newFilters));
    }, [dispatch]);

    // Clear filters handler
    const handleClearFilters = useCallback(() => {
        dispatch(clearFilters());
    }, [dispatch]);

    // Update pagination handler
    const handleUpdatePagination = useCallback((newPagination) => {
        dispatch(setPagination(newPagination));
    }, [dispatch]);

    // Check document safety
    const checkDocumentSafety = useCallback(async (content) => {
        try {
            return await documentService.checkSafety(content);
        } catch (error) {
            logger.error('Failed to check document safety:', error);
            return { safe: false, reason: 'Safety check unavailable' };
        }
    }, []);

    // Get document by ID
    const getDocumentById = useCallback((documentId) => {
        return documentList.find(doc => doc.id === documentId);
    }, [documentList]);

    // Memoized values
    const documentState = useMemo(() => ({
        documents: documentList,
        filteredDocuments,
        selectedDocument,
        isLoading,
        isUploading,
        isDeleting,
        error,
        uploadProgress,
        pagination,
        filters,
        stats,
        acl,
        searchResults,
        isSearching
    }), [
        documentList,
        filteredDocuments,
        selectedDocument,
        isLoading,
        isUploading,
        isDeleting,
        error,
        uploadProgress,
        pagination,
        filters,
        stats,
        acl,
        searchResults,
        isSearching
    ]);

    return {
        ...documentState,
        loadDocuments,
        loadDocument,
        uploadDocument: handleUploadDocument,
        updateDocument: handleUpdateDocument,
        deleteDocument: handleDeleteDocument,
        bulkDelete: handleBulkDelete,
        shareDocument: handleShareDocument,
        revokeShare: handleRevokeShare,
        loadACL,
        downloadDocument: handleDownloadDocument,
        searchDocuments: handleSearchDocuments,
        loadStats,
        loadVersions,
        selectDocument: handleSelectDocument,
        clearSelected: handleClearSelected,
        updateFilters: handleUpdateFilters,
        clearFilters: handleClearFilters,
        updatePagination: handleUpdatePagination,
        checkDocumentSafety,
        getDocumentById
    };
};

export default useDocuments;