import type { HistoryItem } from '../types';
import * as imageDB from './imageDB';

const HISTORY_KEY = 'landscaping_history';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PINS = 7;

/**
 * Reads all history items from localStorage.
 */
const readHistory = (): HistoryItem[] => {
    try {
        const storedHistory = localStorage.getItem(HISTORY_KEY);
        return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (error) {
        console.error("Failed to read history from localStorage", error);
        return [];
    }
};

/**
 * Writes a list of history items to localStorage.
 */
const writeHistory = (history: HistoryItem[]): void => {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        // This is where the original error happened. Now less likely.
        console.error("Failed to write history to localStorage", error);
    }
};

/**
 * Gets history, cleans up old unpinned items, and sorts it.
 * Pinned items are always shown first, then sorted by timestamp.
 */
export const getHistory = (): HistoryItem[] => {
    let history = readHistory();
    const now = Date.now();

    const validHistory = history.filter(item => {
        if (item.isPinned) {
            return true; // Keep all pinned items
        }
        // Keep unpinned items only if they are newer than 7 days
        return (now - item.timestamp) < SEVEN_DAYS_MS;
    });
    
    // If cleanup happened, update localStorage
    if (validHistory.length !== history.length) {
        writeHistory(validHistory);
    }

    // Sort with pinned items first, then by date descending
    return validHistory.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
            return a.isPinned ? -1 : 1;
        }
        return b.timestamp - a.timestamp;
    });
};

/**
 * Saves a new item's metadata to the history.
 */
export const saveHistoryItemMetadata = (item: HistoryItem): void => {
    const history = getHistory();
    writeHistory([item, ...history]);
};

/**
 * Deletes an item from the history and its associated images from IndexedDB.
 */
export const deleteHistoryItem = async (id: string): Promise<HistoryItem[]> => {
    let history = getHistory();
    const itemToDelete = history.find(item => item.id === id);

    if (itemToDelete) {
        try {
            await Promise.all([
                imageDB.deleteImage(itemToDelete.originalImageInfo.id),
                imageDB.deleteImage(itemToDelete.redesignedImageInfo.id)
            ]);
        } catch (err) {
            console.error("Failed to delete one or more images from IndexedDB", err);
            // We proceed to delete the metadata anyway to avoid a stuck entry.
        }
    }
    
    const updatedHistory = history.filter(item => item.id !== id);
    writeHistory(updatedHistory);
    return updatedHistory;
};

/**
 * Deletes multiple items from history and their associated images from IndexedDB.
 */
export const deleteHistoryItems = async (ids: string[]): Promise<HistoryItem[]> => {
    let history = getHistory();
    const itemsToDelete = history.filter(item => ids.includes(item.id));

    if (itemsToDelete.length > 0) {
        const imageIdsToDelete = itemsToDelete.flatMap(item => [
            item.originalImageInfo.id,
            item.redesignedImageInfo.id,
        ]);
        try {
            await Promise.all(imageIdsToDelete.map(id => imageDB.deleteImage(id)));
        } catch (err) {
            console.error("Failed to delete one or more images during bulk delete", err);
        }
    }
    
    const updatedHistory = history.filter(item => !ids.includes(item.id));
    writeHistory(updatedHistory);
    return updatedHistory;
};


/**
 * Toggles the pinned state of a history item.
 * Returns the updated history array or null if pin limit is reached.
 */
export const togglePin = (id: string): HistoryItem[] | null => {
    let history = getHistory();
    const itemToPin = history.find(item => item.id === id);

    if (!itemToPin) return history;

    // If trying to pin, check the limit
    if (!itemToPin.isPinned) {
        const pinCount = history.filter(h => h.isPinned).length;
        if (pinCount >= MAX_PINS) {
            return null; // Pin limit reached
        }
    }

    const updatedHistory = history.map(item =>
        item.id === id ? { ...item, isPinned: !item.isPinned } : item
    );

    // Sort again after pinning/unpinning
    updatedHistory.sort((a, b) => {
        if (a.isPinned !== b.isPinned) {
            return a.isPinned ? -1 : 1;
        }
        return b.timestamp - a.timestamp;
    });

    writeHistory(updatedHistory);
    return updatedHistory;
};