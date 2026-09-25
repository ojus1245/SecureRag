import { Shield, FileSearch, Lock, BookOpen } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

const suggestions = [
  {
    icon: <FileSearch size={18} />,
    text: 'What is our company security policy for remote access?',
  },
  {
    icon: <BookOpen size={18} />,
    text: 'Summarize the employee onboarding process',
  },
  {
    icon: <Lock size={18} />,
    text: 'What are the data encryption requirements?',
  },
  {
    icon: <Shield size={18} />,
    text: 'How do I report a security incident?',
  },
];

export default function WelcomeScreen() {
  const { sendMessage } = useChat();

  return (
    <div className="welcome-container">
      <div className="welcome-icon">
        <Shield size={36} color="white" />
      </div>
      <h1 className="welcome-title">How can I help you today?</h1>
      <p className="welcome-subtitle">
        Ask questions about your enterprise knowledge base. All queries are
        encrypted end-to-end and pass through our safety classification system.
      </p>
      <div className="welcome-suggestions">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="suggestion-card"
            onClick={() => sendMessage(s.text)}
            id={`suggestion-${i}`}
          >
            <div className="suggestion-icon">{s.icon}</div>
            <div className="suggestion-text">{s.text}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
