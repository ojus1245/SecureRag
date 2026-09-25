import { createContext, useContext, useState, useCallback } from 'react';
import { chatAPI } from '../services/api';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [retrievalState, setRetrievalState] = useState(null); // null | 'retrieving' | 'generating' | 'complete'
  const [sourceCount, setSourceCount] = useState(0);

  const startNewChat = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
    setRetrievalState(null);
    setSourceCount(0);
  }, []);

  const sendMessage = useCallback(async (queryText, options = {}) => {
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setRetrievalState('retrieving');
    setSourceCount(0);

    try {
      // Short delay to show retrieval animation
      await new Promise((r) => setTimeout(r, 400));
      setRetrievalState('generating');

      const { data } = await chatAPI.query(queryText, {
        conversationId: activeConversation,
        ...options,
      });

      if (data.success) {
        const result = data.data;

        // Update active conversation ID
        if (!activeConversation) {
          setActiveConversation(result.conversationId);

          // Add to conversation list
          setConversations((prev) => [
            {
              id: result.conversationId,
              title: queryText.slice(0, 50),
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        }

        const assistantMessage = {
          id: `msg-${Date.now()}-resp`,
          role: 'assistant',
          content: result.response,
          citations: result.citations || [],
          sources: result.sources || [],
          confidence: result.confidence,
          timestamp: result.timestamp || new Date().toISOString(),
          conversationId: result.conversationId,
        };

        setSourceCount(result.sources?.length || 0);
        setRetrievalState('complete');
        setMessages((prev) => [...prev, assistantMessage]);

        return assistantMessage;
      } else {
        throw new Error(data.message || 'Query failed');
      }
    } catch (error) {
      const errData = error.response?.data;

      // Handle safety rejection
      if (error.response?.status === 400 && errData?.reason) {
        const safetyMessage = {
          id: `msg-${Date.now()}-safety`,
          role: 'safety',
          content: errData.message,
          reason: errData.reason,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, safetyMessage]);
        setRetrievalState(null);
        return safetyMessage;
      }

      // Generic error
      const errorMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: errData?.message || error.message || 'Something went wrong. Please try again.',
        isError: true,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setRetrievalState(null);
      throw error;
    } finally {
      setIsLoading(false);
      // Clear retrieval state after a delay so the "complete" state is visible
      setTimeout(() => setRetrievalState(null), 2000);
    }
  }, [activeConversation]);

  const selectConversation = useCallback(async (conversationId) => {
    setActiveConversation(conversationId);
    try {
      const { data } = await chatAPI.getHistory(conversationId);
      if (data.success) {
        setMessages(data.data.messages || []);
      }
    } catch {
      setMessages([]);
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId) => {
    try {
      await chatAPI.deleteConversation(conversationId);
    } catch {
      // Continue anyway
    }
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (activeConversation === conversationId) {
      setActiveConversation(null);
      setMessages([]);
    }
  }, [activeConversation]);

  const value = {
    conversations,
    activeConversation,
    messages,
    isLoading,
    retrievalState,
    sourceCount,
    startNewChat,
    sendMessage,
    selectConversation,
    deleteConversation,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
