import React, { useEffect } from 'react';
import { ClerkProvider, useUser } from '@clerk/clerk-react';
import { Header } from './components/Header';
import { Modal } from './components/Modal';
import { DesignerPage } from './pages/DesignerPage';
import { HistoryPage } from './pages/HistoryPage';
import { PricingPage } from './pages/PricingPage';
import { ContactPage } from './pages/ContactPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { FairUsePolicyPage } from './pages/FairUsePolicyPage';
import { SuccessPage } from './pages/SuccessPage';
import { AppProvider, useApp } from './contexts/AppContext';
import { HistoryProvider, useHistory } from './contexts/HistoryContext';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { Footer } from './components/Footer';

const PageContent: React.FC = () => {
  const { page, isModalOpen, modalImage, closeModal, navigateTo } = useApp();
  const { history, pinItem, deleteItem, viewFromHistory } = useHistory();
  const { isSignedIn } = useUser();

  useEffect(() => {
    const baseTitle = 'AI Landscape Designer';
    let pageTitle = page.charAt(0).toUpperCase() + page.slice(1);
    if (page === 'main') pageTitle = 'Home';
    if (page === 'history') pageTitle = 'Projects';
    if (page === 'fairuse') pageTitle = 'Fair Use Policy';

    document.title = `${baseTitle} | ${pageTitle}`;
  }, [page]);

  // Protected Routes Logic
  useEffect(() => {
    if (!isSignedIn && (page === 'history' || page === 'profile')) {
      navigateTo('signin');
    }
  }, [isSignedIn, page, navigateTo]);
  
  const pages: { [key: string]: React.ReactNode } = {
    main: <DesignerPage />,
    history: isSignedIn ? <HistoryPage historyItems={history} onView={viewFromHistory} onPin={pinItem} onDelete={deleteItem} /> : null,
    pricing: <PricingPage onNavigate={navigateTo} />,
    contact: <ContactPage />,
    terms: <TermsPage />,
    privacy: <PrivacyPage />,
    signin: <SignInPage />,
    signup: <SignUpPage />,
    profile: isSignedIn ? <ProfilePage /> : null,
    'reset-password': <ResetPasswordPage />,
    fairuse: <FairUsePolicyPage />,
    success: <SuccessPage />,
  };

  return (
    <div className="min-h-screen text-slate-800 font-sans p-4 sm:p-6 lg:p-8 flex flex-col">
      <div className="w-full flex-grow mx-auto bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg ring-1 ring-black/5 flex flex-col">
        <Header />
        <main className="p-4 sm:p-6 lg:p-8 flex-grow overflow-y-auto flex flex-col">
          {pages[page] || <DesignerPage />}
        </main>
        <Footer />
      </div>
      {isModalOpen && modalImage && <Modal imageUrl={modalImage} onClose={closeModal} />}
      <ToastContainer />
    </div>
  );
};

const App: React.FC = () => {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error('Missing Clerk Publishable Key');
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ToastProvider>
        <AppProvider>
          <HistoryProvider>
            <PageContent />
          </HistoryProvider>
        </AppProvider>
      </ToastProvider>
    </ClerkProvider>
  );
};

export default App;