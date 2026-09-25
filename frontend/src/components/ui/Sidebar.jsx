import {
  MessageSquare,
  Plus,
  Trash2,
  LogOut,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const {
    conversations,
    activeConversation,
    startNewChat,
    selectConversation,
    deleteConversation,
  } = useChat();

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.username?.slice(0, 2)?.toUpperCase() || 'U';

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Shield size={18} />
        </div>
        <div>
          <div className="sidebar-title">SecureRAG</div>
          <div className="sidebar-subtitle">Enterprise Knowledge</div>
        </div>
      </div>

      {/* New Chat */}
      <div className="sidebar-actions">
        <button className="btn-new-chat" onClick={startNewChat} id="btn-new-chat">
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* Conversations */}
      <div className="sidebar-conversations">
        {conversations.length > 0 ? (
          <>
            <div className="conversation-label">Recent</div>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conversation-item ${
                  activeConversation === conv.id ? 'active' : ''
                }`}
                onClick={() => selectConversation(conv.id)}
                id={`conv-${conv.id}`}
              >
                <MessageSquare size={15} className="conv-icon" />
                <span className="conv-text">{conv.title}</span>
                <button
                  className="conv-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  aria-label="Delete conversation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </>
        ) : (
          <div className="empty-conversations">
            No conversations yet. Start one!
          </div>
        )}
      </div>

      {/* User */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.fullName || user?.username}</div>
            <div className="user-role">{user?.role || 'User'}</div>
          </div>
          <button
            className="header-btn"
            onClick={logout}
            title="Sign out"
            id="btn-logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
