import React from 'react';
import { createRoot } from 'react-dom/client';

// Local fonts (no network / CSP dependency)
import '@fontsource-variable/inter';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';

import App from './app/App.jsx';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
