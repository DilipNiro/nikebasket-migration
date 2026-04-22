// src/main.jsx — Point d'entrée React
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // CDC Technique §4.2 : responsive CSS
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
