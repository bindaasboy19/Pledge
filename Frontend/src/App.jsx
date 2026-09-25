import React, { useState, useEffect } from 'react';
import { PledgePage } from './pages/PledgePage';
import { CertificateVerifyPage } from './pages/CertificateVerifyPage';

function parseCertificateIdFromPath(pathname, search) {
  // Check query parameter ?id=...
  const queryParams = new URLSearchParams(search);
  const idFromQuery = queryParams.get('id') || queryParams.get('certificateId');
  if (idFromQuery) return decodeURIComponent(idFromQuery).trim();

  // Check path segments (/certificate/verify/:id or /verify/:id or /certificate/:id)
  const patterns = [
    /^\/certificate\/verify\/(.+)$/i,
    /^\/verify\/(.+)$/i,
    /^\/certificate\/(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = pathname.match(pattern);
    if (match && match[1]) {
      return decodeURIComponent(match[1]).trim();
    }
  }

  return '';
}

export function App() {
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [currentSearch, setCurrentSearch] = useState(
    typeof window !== 'undefined' ? window.location.search : ''
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentSearch(window.location.search);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const isVerifyRoute =
    currentPath.startsWith('/certificate/verify') ||
    currentPath.startsWith('/verify') ||
    currentPath.startsWith('/certificate');

  if (isVerifyRoute) {
    const initialCertId = parseCertificateIdFromPath(currentPath, currentSearch);
    return <CertificateVerifyPage initialCertificateId={initialCertId} />;
  }

  return <PledgePage />;
}

export default App;
