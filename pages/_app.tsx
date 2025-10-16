import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { AppProvider } from '../contexts/AppContext';
import { HistoryProvider } from '../contexts/HistoryContext';
import { ToastProvider } from '../contexts/ToastContext';
import { ToastContainer } from '../components/ToastContainer';
import '../styles.css';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing Clerk Publishable Key');
}

function MyApp({ Component, pageProps }: any) {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ConvexProvider client={convex}>
        <ToastProvider>
          <AppProvider>
            <HistoryProvider>
              <Component {...pageProps} />
              <ToastContainer />
            </HistoryProvider>
          </AppProvider>
        </ToastProvider>
      </ConvexProvider>
    </ClerkProvider>
  );
}

export default MyApp;