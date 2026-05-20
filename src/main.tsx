import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone
) {
  document.documentElement.classList.add('standalone-app');
}

import { resetBodyScroll } from './utils/scrollLock';

// Recover if a modal left body scroll locked (e.g. after HMR)
resetBodyScroll();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
