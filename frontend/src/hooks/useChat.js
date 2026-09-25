import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    sendMessage,
    streamMessage,
    fetchConversations,
    fetchMessages,
    deleteConversation,
    submitFeedback,
    getSuggestions,
    checkSafety,
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
    selectChat,
    selectConversations,
    selectActiveConversation,
    selectMessages,
    selectIsLoading,
    selectIsStreaming,
    selectIsSending,
    selectError,
    selectSources,
    selectCitations,
    selectRetrievalStatus,
    selectSafetyCheck,
    selectStreamingText,
    selectPagination,
    selectFilters,
    selectStats
} from '../store/chatSlice';
import { chatService } from '../services/chatService';
import { logger } from '../utils/logger';

export const useChat = (conversationId = null) => {
    const dispatch = useDispatch();

    const chat = useSelector(selectChat);
    const conversations = useSelector(selectConversations);
    const activeConversation = useSelector(selectActiveConversation);
    const messages = useSelector(selectMessages);
    const isLoading = useSelector(selectIsLoading);
    const isStreaming = useSelector(selectIsStreaming);
    const isSending = useSelector(selectIsSending);
    const error = useSelector(selectError);
    const sources = useSelector(selectSources);
    const citations = useSelector(selectCitations);
    const retrievalStatus = useSelector(selectRetrievalStatus);
    const safetyCheck = useSelector(selectSafetyCheck);
    const streamingText = useSelector(selectStreamingText);
    const pagination = useSelector(selectPagination);
    const filters = useSelector(selectFilters);
    const stats = useSelector(selectStats);

    const [suggestions, setSuggestions] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const streamAbortRef = useRef(null);

    // Set active conversation
    useEffect(() => {
        if (conversationId) {
            dispatch(setActiveConversation(conversationId));
            loadConversation(conversationId);
        }
    }, [conversationId, dispatch]);

    // Load conversations on mount
    useEffect(() => {
        loadConversations();
    }, []);

    // Load conversation messages
    const loadConversation = useCallback(async (convId) => {
        try {
            const result = await dispatch(fetchMessages({
                conversationId: convId,
                page: 1,
                limit: 50
            })).unwrap();
            return result;
        } catch (error) {
            logger.error('Failed to load conversation:', error);
        }
    }, [dispatch]);

    // Load conversations list
    const loadConversations = useCallback(async (params = {}) => {
        try {
            const result = await dispatch(fetchConversations(params)).unwrap();
            return result;
        } catch (error) {
            logger.error('Failed to load conversations:', error);
        }
    }, [dispatch]);

    // Send message handler
    const handleSendMessage = useCallback(async (query, options = {}) => {
        try {
            const result = await dispatch(sendMessage({
                query,
                conversationId: conversationId || activeConversation,
                options
            })).unwrap();

            return result;
        } catch (error) {
            logger.error('Failed to send message:', error);
            throw error;
        }
    }, [dispatch, conversationId, activeConversation]);

    // Stream message handler
    const handleStreamMessage = useCallback(async (query, options = {}) => {
        try {
            const result = await dispatch(streamMessage({
                query,
                conversationId: conversationId || activeConversation,
                options
            })).unwrap();

            return result;
        } catch (error) {
            logger.error('Failed to stream message:', error);
            throw error;
        }
    }, [dispatch, conversationId, activeConversation]);

    // Stop streaming
    const stopStreaming = useCallback(() => {
        if (streamAbortRef.current) {
            streamAbortRef.current.abort();
            streamAbortRef.current = null;
        }
        dispatch(setStreaming(false));
        dispatch(setStreamingText(''));
    }, [dispatch]);

    // Clear conversation
    const handleClearMessages = useCallback(() => {
        dispatch(clearMessages());
    }, [dispatch]);

    // Delete conversation handler
    const handleDeleteConversation = useCallback(async (convId) => {
        try {
            await dispatch(deleteConversation(convId)).unwrap();
            return true;
        } catch (error) {
            logger.error('Failed to delete conversation:', error);
            throw error;
        }
    }, [dispatch]);

    // Submit feedback handler
    const handleSubmitFeedback = useCallback(async (messageId, rating, feedback = '') => {
        try {
            await dispatch(submitFeedback({
                conversationId: conversationId || activeConversation,
                messageId,
                rating,
                feedback
            })).unwrap();
            return true;
        } catch (error) {
            logger.error('Failed to submit feedback:', error);
            throw error;
        }
    }, [dispatch, conversationId, activeConversation]);

    // Get suggestions handler
    const handleGetSuggestions = useCallback(async (query) => {
        try {
            const result = await dispatch(getSuggestions(query)).unwrap();
            setSuggestions(result);
            return result;
        } catch (error) {
            logger.error('Failed to get suggestions:', error);
            return [];
        }
    }, [dispatch]);

    // Check safety handler
    const handleCheckSafety = useCallback(async (query) => {
        try {
            const result = await dispatch(checkSafety(query)).unwrap();
            return result;
        } catch (error) {
            logger.error('Failed to check safety:', error);
            return { safe: false, reason: 'Safety check unavailable' };
        }
    }, [dispatch]);

    // Export conversation
    const exportConversation = useCallback(async () => {
        try {
            const convId = conversationId || activeConversation;
            if (!convId) {
                throw new Error('No active conversation');
            }

            const data = {
                conversationId: convId,
                messages,
                exportedAt: new Date().toISOString()
            };

            return data;
        } catch (error) {
            logger.error('Failed to export conversation:', error);
            throw error;
        }
    }, [conversationId, activeConversation, messages]);

    // Update filters
    const handleUpdateFilters = useCallback((newFilters) => {
        dispatch(setFilters(newFilters));
    }, [dispatch]);

    // Update pagination
    const handleUpdatePagination = useCallback((newPagination) => {
        dispatch(updatePagination(newPagination));
    }, [dispatch]);

    // Memoized values
    const chatState = useMemo(() => ({
        conversations,
        activeConversation,
        messages,
        isLoading,
        isStreaming,
        isSending,
        error,
        sources,
        citations,
        retrievalStatus,
        safetyCheck,
        streamingText,
        pagination,
        filters,
        stats,
        suggestions,
        typingUsers
    }), [
        conversations,
        activeConversation,
        messages,
        isLoading,
        isStreaming,
        isSending,
        error,
        sources,
        citations,
        retrievalStatus,
        safetyCheck,
        streamingText,
        pagination,
        filters,
        stats,
        suggestions,
        typingUsers
    ]);

    return {
        ...chatState,
        sendMessage: handleSendMessage,
        streamMessage: handleStreamMessage,
        stopStreaming,
        clearMessages: handleClearMessages,
        deleteConversation: handleDeleteConversation,
        submitFeedback: handleSubmitFeedback,
        getSuggestions: handleGetSuggestions,
        checkSafety: handleCheckSafety,
        exportConversation,
        loadConversation,
        loadConversations,
        updateFilters: handleUpdateFilters,
        updatePagination: handleUpdatePagination
    };
};

export default useChat;