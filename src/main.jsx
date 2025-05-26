  // src/index.jsx
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
  import App from './App';
  import './index.css';

  // Buat instance QueryClient
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: 30000,
        cacheTime: 5 * 60 * 1000,
        retry: 3,
      },
    },
  });

  const container = document.getElementById('root');
  const root = createRoot(container);

  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );