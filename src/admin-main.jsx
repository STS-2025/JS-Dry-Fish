import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './admin/AdminApp';
import './admin/AdminApp.css';

ReactDOM.createRoot(document.getElementById('admin-root')).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);
