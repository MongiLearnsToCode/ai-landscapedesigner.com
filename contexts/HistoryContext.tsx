import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as historyService from '../services/historyService';
import * as imageDB from '../services/imageDB';
import type { HistoryItem, HydratedHistoryItem, ImageFile, DesignCatalog, LandscapingStyle } from '../types';
import { useToast } from './ToastContext';
import { useApp } from './AppContext';

interface NewRedesignData {
    originalImage: ImageFile;
    redesignedImage: { base64: string; type: string };
    catalog: DesignCatalog;
    styles: LandscapingStyle[];
    climateZone: string;
}

interface HistoryContextType {
  history: HistoryItem[];
  saveNewRedesign: (data: NewRedesignData) => Promise<void>;
  deleteItem: (id: string) => void;
  deleteMultipleItems: (ids: string[]) => Promise<void>;
  pinItem: (id: string) => void;
  viewFromHistory: (item: HistoryItem) => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { addToast } = useToast();
  const { loadItem } = useApp();

  const refreshHistory = useCallback(() => {
    setHistory(historyService.getHistory());
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const saveNewRedesign = useCallback(async (data: NewRedesignData) => {
    const id = `history_${Date.now()}`;
    const originalImageId = `${id}_original`;
    const redesignedImageId = `${id}_redesigned`;

    try {
        await imageDB.saveImage({ id: originalImageId, base64: data.originalImage.base64, type: data.originalImage.type });
        await imageDB.saveImage({ id: redesignedImageId, base64: data.redesignedImage.base64, type: data.redesignedImage.type });

        const historyItemForStorage: HistoryItem = {
            id,
            timestamp: Date.now(),
            isPinned: false,
            styles: data.styles,
            climateZone: data.climateZone,
            designCatalog: data.catalog,
            originalImageInfo: { id: originalImageId, name: data.originalImage.name, type: data.originalImage.type },
            redesignedImageInfo: { id: redesignedImageId, type: data.redesignedImage.type }
        };

        historyService.saveHistoryItemMetadata(historyItemForStorage);
        refreshHistory();
        addToast("Redesign saved to history!", "success");
    } catch (err) {
        console.error("Failed to save history item", err);
        addToast("Error saving redesign to history.", "error");
        // In a production app, you might add cleanup logic here to delete orphaned images from IndexedDB if metadata saving fails.
    }
  }, [refreshHistory, addToast]);

  const deleteItem = useCallback(async (id: string) => {
    await historyService.deleteHistoryItem(id);
    refreshHistory();
    addToast("Item deleted from history.", "info");
  }, [addToast, refreshHistory]);

  const deleteMultipleItems = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    await historyService.deleteHistoryItems(ids);
    refreshHistory();
    addToast(`${ids.length} project${ids.length > 1 ? 's' : ''} deleted.`, "info");
  }, [addToast, refreshHistory]);

  const pinItem = useCallback((id: string) => {
    const updatedHistory = historyService.togglePin(id);
    if (updatedHistory) {
      setHistory(updatedHistory);
      const isPinned = updatedHistory.find(item => item.id === id)?.isPinned;
      addToast(isPinned ? "Item pinned!" : "Item unpinned.", "success");
    } else {
      addToast("You can only pin up to 7 designs.", "error");
    }
  }, [addToast]);

  const viewFromHistory = useCallback(async (item: HistoryItem) => {
    try {
        const originalImageData = await imageDB.getImage(item.originalImageInfo.id);
        const redesignedImageData = await imageDB.getImage(item.redesignedImageInfo.id);

        if (!originalImageData || !redesignedImageData) {
            throw new Error("Could not find images in the local database.");
        }

        const hydratedItem: HydratedHistoryItem = {
            ...item,
            originalImage: {
                base64: originalImageData.base64,
                name: item.originalImageInfo.name,
                type: item.originalImageInfo.type,
            },
            redesignedImage: `data:${redesignedImageData.type};base64,${redesignedImageData.base64}`
        };
        
        loadItem(hydratedItem);
      } catch (err) {
          console.error("Failed to load item from history:", err);
          addToast("Could not load images for this history item.", "error");
      }
  }, [loadItem, addToast]);

  const value = {
    history,
    saveNewRedesign,
    deleteItem,
    deleteMultipleItems,
    pinItem,
    viewFromHistory,
  };

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
};

export const useHistory = (): HistoryContextType => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};