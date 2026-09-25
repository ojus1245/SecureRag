import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { documentService } from '../services/documentService';
import { logger } from '../utils/logger';

// Initial state
const initialState = {
    documents: [],
    selectedDocument: null,
    isLoading: false,
    isUploading: false,
    isDeleting: false,
    error: null,
    uploadProgress: 0,
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        hasMore: false,
        totalPages: 0
    },
    filters: {
        search: '',
        classification: '',
        department: '',
        status: 'published',
        tags: [],
        sortBy: 'createdAt',
        sortOrder: 'desc'
    },
    stats: {
        totalDocuments: 0,
        totalSize: 0,
        byClassification: {},
        byDepartment: {},
        recentUploads: []
    },
    acl: {
        shares: [],
        isLoading: false,
        error: null
    }
};

// Async thunks
export const fetchDocuments = createAsyncThunk(
    'documents/fetchDocuments',
    async (params = {}, { rejectWithValue, getState }) => {
        try {
            const { document } = getState();
            const mergedParams = {
                ...document.filters,
                ...document.pagination,
                ...params
            };

            const response = await documentService.getDocuments(mergedParams);
            return response;
        } catch (error) {
            logger.error('Fetch documents failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const fetchDocument = createAsyncThunk(
    'documents/fetchDocument',
    async (documentId, { rejectWithValue }) => {
        try {
            const response = await documentService.getDocument(documentId);
            return response;
        } catch (error) {
            logger.error('Fetch document failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const uploadDocument = createAsyncThunk(
    'documents/uploadDocument',
    async ({ documentData, file, onProgress }, { rejectWithValue, dispatch }) => {
        try {
            const response = await documentService.uploadDocument(documentData, {
                file,
                onProgress: (progress) => {
                    dispatch(setUploadProgress(progress));
                }
            });
            return response;
        } catch (error) {
            logger.error('Upload document failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const updateDocument = createAsyncThunk(
    'documents/updateDocument',
    async ({ documentId, updateData }, { rejectWithValue }) => {
        try {
            const response = await documentService.updateDocument(documentId, updateData);
            return response;
        } catch (error) {
            logger.error('Update document failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const deleteDocument = createAsyncThunk(
    'documents/deleteDocument',
    async ({ documentId, softDelete = true }, { rejectWithValue }) => {
        try {
            await documentService.deleteDocument(documentId, softDelete);
            return documentId;
        } catch (error) {
            logger.error('Delete document failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const bulkDeleteDocuments = createAsyncThunk(
    'documents/bulkDeleteDocuments',
    async (documentIds, { rejectWithValue }) => {
        try {
            await documentService.bulkDeleteDocuments(documentIds);
            return documentIds;
        } catch (error) {
            logger.error('Bulk delete failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const shareDocument = createAsyncThunk(
    'documents/shareDocument',
    async ({ documentId, shareData }, { rejectWithValue }) => {
        try {
            const response = await documentService.shareDocument(documentId, shareData);
            return response;
        } catch (error) {
            logger.error('Share document failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const revokeDocumentShare = createAsyncThunk(
    'documents/revokeDocumentShare',
    async ({ documentId, userId }, { rejectWithValue }) => {
        try {
            await documentService.revokeDocumentShare(documentId, userId);
            return { documentId, userId };
        } catch (error) {
            logger.error('Revoke share failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const fetchDocumentACL = createAsyncThunk(
    'documents/fetchACL',
    async (documentId, { rejectWithValue }) => {
        try {
            const response = await documentService.getDocumentACL(documentId);
            return response;
        } catch (error) {
            logger.error('Fetch ACL failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const downloadDocument = createAsyncThunk(
    'documents/downloadDocument',
    async (documentId, { rejectWithValue }) => {
        try {
            await documentService.downloadDocument(documentId);
            return documentId;
        } catch (error) {
            logger.error('Download document failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const searchDocuments = createAsyncThunk(
    'documents/searchDocuments',
    async ({ query, filters = {} }, { rejectWithValue }) => {
        try {
            const response = await documentService.searchDocuments(query, filters);
            return response;
        } catch (error) {
            logger.error('Search documents failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const fetchDocumentStats = createAsyncThunk(
    'documents/fetchStats',
    async (_, { rejectWithValue }) => {
        try {
            const response = await documentService.getDocumentStats();
            return response;
        } catch (error) {
            logger.error('Fetch stats failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const fetchDocumentVersions = createAsyncThunk(
    'documents/fetchVersions',
    async (documentId, { rejectWithValue }) => {
        try {
            const response = await documentService.getDocumentVersions(documentId);
            return response;
        } catch (error) {
            logger.error('Fetch versions failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

// Create slice
const documentSlice = createSlice({
    name: 'documents',
    initialState,
    reducers: {
        setSelectedDocument: (state, action) => {
            state.selectedDocument = action.payload;
        },

        clearSelectedDocument: (state) => {
            state.selectedDocument = null;
        },

        setUploadProgress: (state, action) => {
            state.uploadProgress = action.payload;
        },

        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },

        setPagination: (state, action) => {
            state.pagination = { ...state.pagination, ...action.payload };
        },

        clearFilters: (state) => {
            state.filters = initialState.filters;
        },

        setError: (state, action) => {
            state.error = action.payload;
        },

        clearError: (state) => {
            state.error = null;
        },

        resetDocuments: (state) => {
            return { ...initialState };
        }
    },

    extraReducers: (builder) => {
        builder
            // Fetch Documents
            .addCase(fetchDocuments.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchDocuments.fulfilled, (state, action) => {
                state.isLoading = false;
                state.documents = action.payload.documents || [];
                state.pagination = {
                    ...state.pagination,
                    total: action.payload.total || 0,
                    totalPages: action.payload.pages || 0,
                    hasMore: action.payload.hasNext || false
                };
            })
            .addCase(fetchDocuments.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Fetch Single Document
            .addCase(fetchDocument.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchDocument.fulfilled, (state, action) => {
                state.isLoading = false;
                state.selectedDocument = action.payload;
            })
            .addCase(fetchDocument.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Upload Document
            .addCase(uploadDocument.pending, (state) => {
                state.isUploading = true;
                state.uploadProgress = 0;
                state.error = null;
            })
            .addCase(uploadDocument.fulfilled, (state, action) => {
                state.isUploading = false;
                state.uploadProgress = 100;
                state.documents.unshift(action.payload);
            })
            .addCase(uploadDocument.rejected, (state, action) => {
                state.isUploading = false;
                state.uploadProgress = 0;
                state.error = action.payload;
            })

            // Update Document
            .addCase(updateDocument.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateDocument.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.documents.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.documents[index] = { ...state.documents[index], ...action.payload };
                }
                if (state.selectedDocument?.id === action.payload.id) {
                    state.selectedDocument = { ...state.selectedDocument, ...action.payload };
                }
            })
            .addCase(updateDocument.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Delete Document
            .addCase(deleteDocument.pending, (state) => {
                state.isDeleting = true;
                state.error = null;
            })
            .addCase(deleteDocument.fulfilled, (state, action) => {
                state.isDeleting = false;
                state.documents = state.documents.filter(d => d.id !== action.payload);
                if (state.selectedDocument?.id === action.payload) {
                    state.selectedDocument = null;
                }
            })
            .addCase(deleteDocument.rejected, (state, action) => {
                state.isDeleting = false;
                state.error = action.payload;
            })

            // Bulk Delete
            .addCase(bulkDeleteDocuments.fulfilled, (state, action) => {
                const deletedIds = action.payload;
                state.documents = state.documents.filter(d => !deletedIds.includes(d.id));
            })

            // Share Document
            .addCase(shareDocument.fulfilled, (state, action) => {
                state.acl.shares.push(action.payload);
            })

            // Revoke Share
            .addCase(revokeDocumentShare.fulfilled, (state, action) => {
                const { userId } = action.payload;
                state.acl.shares = state.acl.shares.filter(s => s.user.id !== userId);
            })

            // Fetch ACL
            .addCase(fetchDocumentACL.pending, (state) => {
                state.acl.isLoading = true;
                state.acl.error = null;
            })
            .addCase(fetchDocumentACL.fulfilled, (state, action) => {
                state.acl.isLoading = false;
                state.acl.shares = action.payload.shares || [];
            })
            .addCase(fetchDocumentACL.rejected, (state, action) => {
                state.acl.isLoading = false;
                state.acl.error = action.payload;
            })

            // Search Documents
            .addCase(searchDocuments.fulfilled, (state, action) => {
                state.documents = action.payload.documents || [];
                state.pagination.total = action.payload.total || 0;
            })

            // Fetch Stats
            .addCase(fetchDocumentStats.fulfilled, (state, action) => {
                state.stats = action.payload;
            });
    }
});

// Export actions
export const {
    setSelectedDocument,
    clearSelectedDocument,
    setUploadProgress,
    setFilters,
    setPagination,
    clearFilters,
    setError,
    clearError,
    resetDocuments
} = documentSlice.actions;

// Selectors
export const selectDocuments = (state) => state.documents;
export const selectDocumentList = (state) => state.documents.documents;
export const selectSelectedDocument = (state) => state.documents.selectedDocument;
export const selectIsLoading = (state) => state.documents.isLoading;
export const selectIsUploading = (state) => state.documents.isUploading;
export const selectIsDeleting = (state) => state.documents.isDeleting;
export const selectError = (state) => state.documents.error;
export const selectUploadProgress = (state) => state.documents.uploadProgress;
export const selectPagination = (state) => state.documents.pagination;
export const selectFilters = (state) => state.documents.filters;
export const selectStats = (state) => state.documents.stats;
export const selectACL = (state) => state.documents.acl;

// Memoized selectors
export const selectDocumentsByClassification = createSelector(
    [selectDocumentList],
    (documents) => {
        const grouped = {};
        documents.forEach(doc => {
            const classification = doc.classification || 'unknown';
            if (!grouped[classification]) {
                grouped[classification] = [];
            }
            grouped[classification].push(doc);
        });
        return grouped;
    }
);

export const selectDocumentsByDepartment = createSelector(
    [selectDocumentList],
    (documents) => {
        const grouped = {};
        documents.forEach(doc => {
            const department = doc.department || 'unknown';
            if (!grouped[department]) {
                grouped[department] = [];
            }
            grouped[department].push(doc);
        });
        return grouped;
    }
);

export const selectFilteredDocuments = createSelector(
    [selectDocumentList, selectFilters],
    (documents, filters) => {
        return documents.filter(doc => {
            // Search filter
            if (filters.search && !doc.title?.toLowerCase().includes(filters.search.toLowerCase())) {
                return false;
            }

            // Classification filter
            if (filters.classification && doc.classification !== filters.classification) {
                return false;
            }

            // Department filter
            if (filters.department && doc.department !== filters.department) {
                return false;
            }

            // Status filter
            if (filters.status && doc.status !== filters.status) {
                return false;
            }

            // Tags filter
            if (filters.tags?.length > 0) {
                const hasTag = filters.tags.some(tag => doc.tags?.includes(tag));
                if (!hasTag) return false;
            }

            return true;
        });
    }
);

export const selectConfidentialDocuments = createSelector(
    [selectDocumentList],
    (documents) => documents.filter(doc =>
        doc.classification === 'confidential' || doc.classification === 'restricted'
    )
);

export default documentSlice.reducer;