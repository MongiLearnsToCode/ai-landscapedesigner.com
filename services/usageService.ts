import { ConvexReactClient } from "convex/react";
import { api } from "../convex/_generated/api";
import { getDeviceId, getExtendedFingerprint } from "./fingerprintService";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);

// Generate anonymous session ID for unauthenticated users
export const getAnonymousUserId = (): string => {
  let anonymousId = localStorage.getItem('anonymous_user_id');
  if (!anonymousId) {
    anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('anonymous_user_id', anonymousId);
  }
  return anonymousId;
};

export const getUserId = (clerkUserId?: string): string => {
  return clerkUserId || getAnonymousUserId();
};

// Get client info for server tracking
const getClientInfo = () => {
  return {
    deviceId: getDeviceId(),
    deviceFingerprint: getExtendedFingerprint(),
    ipAddress: undefined, // Will be detected server-side if needed
    userAgent: navigator.userAgent
  };
};

export interface UsageStatus {
  canRedesign: boolean;
  redesignCount: number;
  remainingRedesigns: number;
  isSubscribed: boolean;
}

export const checkRedesignLimit = async (
  clerkUserId?: string,
  isSubscribed = false
): Promise<UsageStatus> => {
  const userId = getUserId(clerkUserId);
  const isAuthenticated = !!clerkUserId;
  const clientInfo = getClientInfo();

  // Update device session for tracking
  if (!isAuthenticated) {
    await convex.mutation(api.usage.updateDeviceSession, {
      userId,
      isAuthenticated,
      ...clientInfo
    });
  }

  return await convex.query(api.usage.checkRedesignLimit, {
    userId,
    isAuthenticated,
    isSubscribed,
    ...clientInfo
  });
};

export const checkRateLimit = async (
  clerkUserId?: string,
  action: string = 'redesign'
): Promise<{ allowed: boolean; attemptsRemaining: number }> => {
  const userId = getUserId(clerkUserId);

  return await convex.query(api.usage.checkRateLimit, {
    userId,
    action
  });
};

export const incrementRedesignCount = async (
  clerkUserId?: string,
  isSubscribed = false
): Promise<void> => {
  const userId = getUserId(clerkUserId);
  const isAuthenticated = !!clerkUserId;
  const clientInfo = getClientInfo();

  await convex.mutation(api.usage.incrementRedesignCount, {
    userId,
    isAuthenticated,
    isSubscribed,
    ...clientInfo
  });
};

export const incrementRateLimit = async (
  clerkUserId?: string,
  action: string = 'redesign'
): Promise<void> => {
  const userId = getUserId(clerkUserId);

  await convex.mutation(api.usage.incrementRateLimit, {
    userId,
    action
  });
};

export const updateSubscriptionStatus = async (
  clerkUserId: string,
  isSubscribed: boolean
): Promise<void> => {
  await convex.mutation(api.usage.updateSubscriptionStatus, {
    userId: clerkUserId,
    isSubscribed
  });
};
