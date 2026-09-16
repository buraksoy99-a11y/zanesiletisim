import React from 'react';
import {hydrateRoot} from 'react-dom/client';
import App from './App';
import './style.css';

hydrateRoot(document.getElementById('root'), <React.StrictMode><App /></React.StrictMode>);
