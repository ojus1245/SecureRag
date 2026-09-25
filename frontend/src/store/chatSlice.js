import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { chatService } from '../services/chatService';
import { logger } from '../utils/logger';

// Initial state
const initialState = {
    conversations: [],
    activeConversation: null,
    messages: [],
    isLoading: false,
    isStreaming: false,
    isSending: false,
    error: null,
    sources: [],
    citations: [],
    retrievalStatus: null,
    safetyCheck: null,
    streamingText: '',
    pagination: {
        page: 1,
        limit: 50,
        total: 0,
        hasMore: false
    },
    filters: {
        search: '',
        sortBy: 'updatedAt',
        sortOrder: 'desc'
    },
    stats: {
        totalQueries: 0,
        averageResponseTime: 0,
        totalTokens: 0
    }
};

// Async thunks
export const sendMessage = createAsyncThunk(
    'chat/sendMessage',
    async ({ query, conversationId, options = {} }, { rejectWithValue, dispatch }) => {
        try {
            logger.info('Sending message...');

            // Check safety first
            const safetyResult = await chatService.checkSafety(query);

            if (!safetyResult.safe) {
                return {
                    safetyBlocked: true,
                    safetyResult,
                    query
                };
            }

            // Send query
            const response = await chatService.sendQuery(query, {
                conversationId,
                ...options
            });

            return {
                query,
                response,
                conversationId,
                safetyResult
            };
        } catch (error) {
            logger.error('Send message failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const streamMessage = createAsyncThunk(
    'chat/streamMessage',
    async ({ query, conversationId, options = {} }, { rejectWithValue, dispatch }) => {
        try {
            logger.info('Streaming message...');

            const safetyResult = await chatService.checkSafety(query);

            if (!safetyResult.safe) {
                return {
                    safetyBlocked: true,
                    safetyResult,
                    query
                };
            }

            return new Promise((resolve, reject) => {
                let fullText = '';

                chatService.streamQuery(
                    query,
                    { conversationId, ...options },
                    // onChunk
                    (chunk) => {
                        fullText += chunk;
                        dispatch(setStreamingText(fullText));
                    },
                    // onComplete
                    (data) => {
                        resolve({
                            query,
                            response: { text: fullText, ...data },
                            conversationId,
                            safetyResult
                        });
                    },
                    // onError
                    (error) => {
                        reject(rejectWithValue(error.message));
                    }
                );
            });
        } catch (error) {
            logger.error('Stream message failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const fetchConversations = createAsyncThunk(
    'chat/fetchConversations',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await chatService.getConversations(
                params.page || 1,
                params.limit || 20
            );
            return response;
        } catch (error) {
            logger.error('Fetch conversations failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const fetchMessages = createAsyncThunk(
    'chat/fetchMessages',
    async ({ conversationId, page = 1, limit = 50 }, { rejectWithValue }) => {
        try {
            const response = await chatService.getConversationMessages(
                conversationId,
                page,
                limit
            );
            return response;
        } catch (error) {
            logger.error('Fetch messages failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const deleteConversation = createAsyncThunk(
    'chat/deleteConversation',
    async (conversationId, { rejectWithValue }) => {
        try {
            await chatService.deleteConversation(conversationId);
            return conversationId;
        } catch (error) {
            logger.error('Delete conversation failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const submitFeedback = createAsyncThunk(
    'chat/submitFeedback',
    async ({ conversationId, messageId, rating, feedback }, { rejectWithValue }) => {
        try {
            const response = await chatService.submitFeedback(
                conversationId,
                messageId,
                rating,
                feedback
            );
            return { messageId, rating, response };
        } catch (error) {
            logger.error('Submit feedback failed:', error);
            return rejectWithValue(error.message);
        }
    }
);

export const getSuggestions = createAsyncThunk(
    'chat/getSuggestions',
    async (query, { rejectWithValue }) => {
        try {
            const suggestions = await chatService.getSuggestions(query);
            return suggestions;
        } catch (error) {
            logger.error('Get suggestions failed:', error);
            return [];
        }
    }
);

export const checkSafety = createAsyncThunk(
    'chat/checkSafety',
    async (query, { rejectWithValue }) => {
        try {
            const result = await chatService.checkSafety(query);
            return result;
        } catch (error) {
            logger.error('Safety check failed:', error);
            return {
                safe: false,
                reason: 'Safety check unavailable'
            };
        }
    }
);

// Create slice
const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setActiveConversation: (state, action) => {
            state.activeConversation = action.payload;
        },

        setMessages: (state, action) => {
            state.messages = action.payload;
        },

        addMessage: (state, action) => {
            state.messages.push(action.payload);
        },

        updateMessage: (state, action) => {
            const { messageId, updates } = action.payload;
            const index = state.messages.findIndex(m => m.id === messageId);
            if (index !== -1) {
                state.messages[index] = { ...state.messages[index], ...updates };
            }
        },

        removeMessage: (state, action) => {
            state.messages = state.messages.filter(m => m.id !== action.payload);
        },

        clearMessages: (state) => {
            state.messages = [];
            state.sources = [];
            state.citations = [];
        },

        setStreamingText: (state, action) => {
            state.streamingText = action.payload;
        },

        setStreaming: (state, action) => {
            state.isStreaming = action.payload;
        },

        setSending: (state, action) => {
            state.isSending = action.payload;
        },

        setSources: (state, action) => {
            state.sources = action.payload;
        },

        setCitations: (state, action) => {
            state.citations = action.payload;
        },

        setRetrievalStatus: (state, action) => {
            state.retrievalStatus = action.payload;
        },

        setSafetyCheck: (state, action) => {
            state.safetyCheck = action.payload;
        },

        setError: (state, action) => {
            state.error = action.payload;
        },

        clearError: (state) => {
            state.error = null;
        },

        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },

        updatePagination: (state, action) => {
            state.pagination = { ...state.pagination, ...action.payload };
        },

        resetChat: (state) => {
            return { ...initialState };
        }
    },

    extraReducers: (builder) => {
        builder
            // Send Message
            .addCase(sendMessage.pending, (state) => {
                state.isSending = true;
                state.error = null;
                state.retrievalStatus = { status: 'retrieving', message: 'Searching documents...' };
            })
            .addCase(sendMessage.fulfilled, (state, action) => {
                state.isSending = false;
                state.retrievalStatus = null;

                if (action.payload.safetyBlocked) {
                    state.safetyCheck = action.payload.safetyResult;
                    return;
                }

                const { query, response, conversationId } = action.payload;

                // Add user message
                state.messages.push({
                    id: `user-${Date.now()}`,
                    role: 'user',
                    content: query,
                    timestamp: new Date().toISOString()
                });

                // Add assistant message
                state.messages.push({
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: response.text,
                    timestamp: new Date().toISOString(),
                    citations: response.citations || [],
                    sources: response.sources || [],
                    model: response.model,
                    safetyScore: response.confidence
                });

                state.sources = response.sources || [];
                state.citations = response.citations || [];
                state.activeConversation = conversationId;

                // Update stats
                state.stats.totalQueries += 1;
                if (response.responseTime) {
                    const { averageResponseTime, totalQueries } = state.stats;
                    state.stats.averageResponseTime =
                        (averageResponseTime * (totalQueries - 1) + response.responseTime) / totalQueries;
                }
            })
            .addCase(sendMessage.rejected, (state, action) => {
                state.isSending = false;
                state.retrievalStatus = null;
                state.error = action.payload;
            })

            // Stream Message
            .addCase(streamMessage.pending, (state) => {
                state.isStreaming = true;
                state.streamingText = '';
                state.error = null;
                state.retrievalStatus = { status: 'retrieving', message: 'Searching documents...' };
            })
            .addCase(streamMessage.fulfilled, (state, action) => {
                state.isStreaming = false;
                state.streamingText = '';
                state.retrievalStatus = null;

                if (action.payload.safetyBlocked) {
                    state.safetyCheck = action.payload.safetyResult;
                    return;
                }

                const { query, response, conversationId } = action.payload;

                state.messages.push({
                    id: `user-${Date.now()}`,
                    role: 'user',
                    content: query,
                    timestamp: new Date().toISOString()
                });

                state.messages.push({
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: response.text,
                    timestamp: new Date().toISOString(),
                    citations: response.citations || [],
                    sources: response.sources || []
                });

                state.sources = response.sources || [];
                state.citations = response.citations || [];
                state.activeConversation = conversationId;
            })
            .addCase(streamMessage.rejected, (state, action) => {
                state.isStreaming = false;
                state.streamingText = '';
                state.retrievalStatus = null;
                state.error = action.payload;
            })

            // Fetch Conversations
            .addCase(fetchConversations.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchConversations.fulfilled, (state, action) => {
                state.isLoading = false;
                state.conversations = action.payload.conversations || [];
                state.pagination.total = action.payload.total || 0;
            })
            .addCase(fetchConversations.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Fetch Messages
            .addCase(fetchMessages.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchMessages.fulfilled, (state, action) => {
                state.isLoading = false;
                state.messages = action.payload.messages || [];
                state.pagination.total = action.payload.total || 0;
            })
            .addCase(fetchMessages.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // Delete Conversation
            .addCase(deleteConversation.fulfilled, (state, action) => {
                state.conversations = state.conversations.filter(
                    conv => conv.id !== action.payload
                );
                if (state.activeConversation === action.payload) {
                    state.activeConversation = null;
                    state.messages = [];
                }
            })

            // Submit Feedback
            .addCase(submitFeedback.fulfilled, (state, action) => {
                const { messageId, rating } = action.payload;
                const message = state.messages.find(m => m.id === messageId);
                if (message) {
                    message.feedback = rating;
                }
            })

            // Safety Check
            .addCase(checkSafety.fulfilled, (state, action) => {
                state.safetyCheck = action.payload;
            });
    }
});

// Export actions
export const {
    setActiveConversation,
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    setStreamingText,
    setStreaming,
    setSending,
    setSources,
    setCitations,
    setRetrievalStatus,
    setSafetyCheck,
    setError,
    clearError,
    setFilters,
    updatePagination,
    resetChat
} = chatSlice.actions;

// Selectors
export const selectChat = (state) => state.chat;
export const selectConversations = (state) => state.chat.conversations;
export const selectActiveConversation = (state) => state.chat.activeConversation;
export const selectMessages = (state) => state.chat.messages;
export const selectIsLoading = (state) => state.chat.isLoading;
export const selectIsStreaming = (state) => state.chat.isStreaming;
export const selectIsSending = (state) => state.chat.isSending;
export const selectError = (state) => state.chat.error;
export const selectSources = (state) => state.chat.sources;
export const selectCitations = (state) => state.chat.citations;
export const selectRetrievalStatus = (state) => state.chat.retrievalStatus;
export const selectSafetyCheck = (state) => state.chat.safetyCheck;
export const selectStreamingText = (state) => state.chat.streamingText;
export const selectPagination = (state) => state.chat.pagination;
export const selectFilters = (state) => state.chat.filters;
export const selectStats = (state) => state.chat.stats;

// Memoized selectors
export const selectMessagesByConversation = createSelector(
    [selectMessages, selectActiveConversation],
    (messages, conversationId) => {
        if (!conversationId) return messages;
        return messages.filter(m => m.conversationId === conversationId);
    }
);

export const selectLastMessage = createSelector(
    [selectMessages],
    (messages) => messages.length > 0 ? messages[messages.length - 1] : null
);

export default chatSlice.reducer;