import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';
import { authService } from './authService';
import { logger } from '../utils/logger';
import { eventBus } from '../utils/eventBus';

class ChatService {
    constructor() {
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
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor
        this.api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    eventBus.emit('auth:logout');
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * Send chat query
     */
    async sendQuery(query, options = {}) {
        try {
            const response = await this.api.post(API_ENDPOINTS.CHAT.QUERY, {
                query,
                ...options
            });

            logger.info('Chat query sent successfully');
            eventBus.emit('chat:message_sent', response.data.data);

            return response.data.data;
        } catch (error) {
            logger.error('Chat query failed:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Stream chat query
     */
    async streamQuery(query, options = {}, onChunk, onComplete, onError) {
        try {
            const token = authService.getToken();

            const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CHAT.STREAM}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    query,
                    ...options,
                    stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`Streaming failed: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === 'chunk') {
                            onChunk?.(data.text);
                        } else if (data.type === 'complete') {
                            onComplete?.(data);
                        } else if (data.type === 'error') {
                            onError?.(new Error(data.message));
                        }
                    }
                }
            }
        } catch (error) {
            logger.error('Streaming query failed:', error);
            onError?.(error);
        }
    }

    /**
     * Check query safety
     */
    async checkSafety(query) {
        try {
            const response = await this.api.post(API_ENDPOINTS.CHAT.SAFETY_CHECK, {
                text: query
            });
            return response.data;
        } catch (error) {
            logger.error('Safety check failed:', error);
            // Fail closed - return unsafe
            return {
                safe: false,
                reason: 'Safety check unavailable'
            };
        }
    }

    /**
     * Get conversation history
     */
    async getConversations(page = 1, limit = 20) {
        try {
            const response = await this.api.get(API_ENDPOINTS.CHAT.CONVERSATIONS, {
                params: { page, limit }
            });
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get conversations:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get conversation messages
     */
    async getConversationMessages(conversationId, page = 1, limit = 50) {
        try {
            const response = await this.api.get(
                API_ENDPOINTS.CHAT.HISTORY.replace(':conversationId', conversationId),
                { params: { page, limit } }
            );
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get conversation messages:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Delete conversation
     */
    async deleteConversation(conversationId) {
        try {
            const response = await this.api.delete(
                API_ENDPOINTS.CHAT.CONVERSATION.replace(':conversationId', conversationId)
            );
            logger.info('Conversation deleted');
            return response.data;
        } catch (error) {
            logger.error('Failed to delete conversation:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Submit feedback
     */
    async submitFeedback(conversationId, messageId, rating, feedback = '') {
        try {
            const response = await this.api.post(API_ENDPOINTS.CHAT.FEEDBACK, {
                conversationId,
                messageId,
                rating,
                feedback
            });
            logger.info('Feedback submitted');
            return response.data;
        } catch (error) {
            logger.error('Failed to submit feedback:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Get query suggestions
     */
    async getSuggestions(query, limit = 5) {
        try {
            const response = await this.api.get(API_ENDPOINTS.CHAT.SUGGESTIONS, {
                params: { query, limit }
            });
            return response.data.data;
        } catch (error) {
            logger.error('Failed to get suggestions:', error);
            return [];
        }
    }

    /**
     * Upload attachment
     */
    async uploadAttachment(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await this.api.post(API_ENDPOINTS.CHAT.UPLOAD, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    eventBus.emit('chat:upload_progress', {
                        fileName: file.name,
                        progress: percentCompleted
                    });
                }
            });

            return response.data.data;
        } catch (error) {
            logger.error('Failed to upload attachment:', error);
            throw this.handleError(error);
        }
    }

    /**
     * Export conversation
     */
    async exportConversation(conversationId) {
        try {
            const response = await this.api.get(
                API_ENDPOINTS.CHAT.EXPORT.replace(':conversationId', conversationId),
                { responseType: 'blob' }
            );
            return response.data;
        } catch (error) {
            logger.error('Failed to export conversation:', error);
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
                    return new Error('Session expired. Please login again.');
                case 403:
                    return new Error(data.message || 'Access denied');
                case 404:
                    return new Error(data.message || 'Not found');
                case 429:
                    return new Error('Rate limit exceeded. Please try again later.');
                case 500:
                    return new Error(data.message || 'Server error');
                default:
                    return new Error(data.message || 'An error occurred');
            }
        } else if (error.request) {
            return new Error('Network error. Please check your connection.');
        } else {
            return new Error(error.message || 'An error occurred');
        }
    }
}

export const chatService = new ChatService();
export default chatService;