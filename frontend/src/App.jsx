import React, { useEffect, useState, Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { StyledEngineProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { store } from './store';
import { getCurrentUser, selectIsAuthenticated, clearAuth } from './store/authSlice';
import { resetChat } from './store/chatSlice';
import { authService } from './services/authService';
import { lightTheme, darkTheme } from './themes';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useWebSocket } from './hooks/useWebSocket';
import { logger } from './utils/logger';
import { eventBus } from './utils/eventBus';

// Layout components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Chat = lazy(() => import('./pages/Chat'));
const Documents = lazy(() => import('./pages/Documents'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Settings = lazy(() => import('./pages/Settings'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const History = lazy(() => import('./pages/History'));
const Analytics = lazy(() => import('./pages/Analytics'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Loading component
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh'
  }}>
    <div className="loading-spinner">
      <div className="spinner" />
      <p>Loading...</p>
    </div>
  </div>
);

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Application error:', error, errorInfo);
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          padding: '24px',
          textAlign: 'center',
          backgroundColor: '#0a0f1d',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '8px' }}>Something went wrong</h1>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>We apologize for the inconvenience. Please try refreshing the page.</p>
          <pre style={{
            margin: '16px 0',
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            borderRadius: '8px',
            maxWidth: '85vw',
            overflowX: 'auto',
            textAlign: 'left',
            fontSize: '12px',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error || 'Unknown error occurred')}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main App component
const AppContent = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const theme = isDarkMode ? darkTheme : lightTheme;

  // FIXED: Use import.meta.env instead of process.env
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';
  const { connectionStatus, sendMessage } = useWebSocket(wsUrl);

  // Check authentication on mount
  useEffect(() => {
    const token = authService.getToken();
    if (token) {
      dispatch(getCurrentUser());
    }
  }, [dispatch]);

  // Subscribe to global events
  useEffect(() => {
    const unsubscribeAuth = eventBus.on('auth:logout', () => {
      dispatch(clearAuth());
      dispatch(resetChat());
      authService.clearTokens();
      authService.clearUser();
      navigate('/login');
    });

    const unsubscribeError = eventBus.on('app:error', (error) => {
      logger.error('Application error event:', error);
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeError) unsubscribeError();
    };
  }, [navigate]);

  // Handle route changes
  useEffect(() => {
    logger.debug(`Route changed: ${location.pathname}`);
  }, [location]);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Check if current route is public
  const isPublicRoute = ['/login', '/register', '/forgot-password'].includes(
    location.pathname
  );

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StyledEngineProvider injectFirst>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <div className="app-container">
              {isPublicRoute ? (
                // Public routes layout
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<Login />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </Routes>
                </Suspense>
              ) : (
                // Protected routes layout
                <div className="app-layout">
                  <Navbar
                    onSidebarToggle={handleSidebarToggle}
                    sidebarOpen={sidebarOpen}
                  />

                  <div className="app-body">
                    <Sidebar
                      open={sidebarOpen}
                      onClose={() => setSidebarOpen(false)}
                      collapsed={sidebarCollapsed}
                      onCollapse={handleSidebarCollapse}
                    />

                    <main className="app-main">
                      <Suspense fallback={<LoadingFallback />}>
                        <Routes>
                          <Route
                            path="/"
                            element={
                              <ProtectedRoute>
                                <Navigate to="/dashboard" replace />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/dashboard"
                            element={
                              <ProtectedRoute>
                                <Dashboard />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/chat"
                            element={
                              <ProtectedRoute requiredPermissions={['chat:query']}>
                                <Chat />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/chat/:conversationId"
                            element={
                              <ProtectedRoute requiredPermissions={['chat:query']}>
                                <Chat />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/documents"
                            element={
                              <ProtectedRoute requiredPermissions={['document:read']}>
                                <Documents />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/documents/upload"
                            element={
                              <ProtectedRoute requiredPermissions={['document:create']}>
                                <Documents />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/documents/:documentId"
                            element={
                              <ProtectedRoute requiredPermissions={['document:read']}>
                                <Documents />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/admin"
                            element={
                              <ProtectedRoute requiredRole="admin">
                                <AdminDashboard />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/admin/users"
                            element={
                              <ProtectedRoute requiredPermissions={['user:manage']}>
                                <AdminDashboard />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/admin/roles"
                            element={
                              <ProtectedRoute requiredPermissions={['role:manage']}>
                                <AdminDashboard />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/admin/audit"
                            element={
                              <ProtectedRoute requiredPermissions={['audit:view']}>
                                <AuditLogs />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/admin/settings"
                            element={
                              <ProtectedRoute requiredPermissions={['system:configure']}>
                                <AdminDashboard />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/audit"
                            element={
                              <ProtectedRoute requiredPermissions={['audit:view']}>
                                <AuditLogs />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/settings"
                            element={
                              <ProtectedRoute>
                                <Settings />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/profile"
                            element={
                              <ProtectedRoute>
                                <Profile />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/history"
                            element={
                              <ProtectedRoute requiredPermissions={['chat:history']}>
                                <History />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="/analytics"
                            element={
                              <ProtectedRoute requiredPermissions={['audit:view']}>
                                <Analytics />
                              </ProtectedRoute>
                            }
                          />

                          <Route
                            path="*"
                            element={<NotFound />}
                          />
                        </Routes>
                      </Suspense>
                    </main>
                  </div>
                </div>
              )}

              {/* Toast notifications */}
              <ToastContainer
                position="bottom-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme={isDarkMode ? 'dark' : 'light'}
              />
            </div>
          </LocalizationProvider>
        </StyledEngineProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

// Root App component
const App = () => {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
};

export default App;