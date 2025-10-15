import React, { createContext, useState, useContext, useCallback } from 'react';
import type { HydratedHistoryItem, User } from '../types';

export type Page = 'main' | 'history' | 'pricing' | 'contact' | 'terms' | 'privacy' | 'signin' | 'signup' | 'profile' | 'reset-password' | 'fairuse' | 'success';

interface AppContextType {
  page: Page;
  navigateTo: (page: Page) => void;
  isModalOpen: boolean;
  modalImage: string | null;
  openModal: (imageUrl: string) => void;
  closeModal: () => void;
  itemToLoad: HydratedHistoryItem | null;
  onItemLoaded: () => void;
  loadItem: (item: HydratedHistoryItem) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [page, setPage] = useState<Page>('main');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [itemToLoad, setItemToLoad] = useState<HydratedHistoryItem | null>(null);
  
  const navigateTo = (page: Page) => {
    setPage(page);
    window.scrollTo(0, 0);
  };

  const openModal = (imageUrl: string) => {
    setModalImage(imageUrl);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalImage(null);
  };

  const loadItem = (item: HydratedHistoryItem) => {
    setItemToLoad(item);
    navigateTo('main');
  };

  const onItemLoaded = useCallback(() => {
    setItemToLoad(null);
  }, []);

  const value = {
    page,
    navigateTo,
    isModalOpen,
    modalImage,
    openModal,
    closeModal,
    itemToLoad,
    onItemLoaded,
    loadItem,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};