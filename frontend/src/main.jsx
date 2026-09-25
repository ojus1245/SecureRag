import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/index.css';

// Create root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a div with id="root" in your HTML.');
}

// Create React root
const root = ReactDOM.createRoot(rootElement);

// Render application — App.jsx handles all providers (Redux, Router, MUI)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Enable hot module replacement in development
if (import.meta.hot) {
  import.meta.hot.accept();
}