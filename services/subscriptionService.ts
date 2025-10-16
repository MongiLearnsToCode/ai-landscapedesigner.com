import { ConvexReactClient } from "convex/react";
import { api } from "../convex/_generated/api";
import { createCheckoutSession, getProducts, type PolarProduct } from "./polarService";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const getUserSubscription = async (userId: string) => {
  return await convex.query(api.subscriptions.getUserSubscription, { userId });
};

export const isUserSubscribed = async (userId: string): Promise<boolean> => {
  return await convex.query(api.subscriptions.isUserSubscribed, { userId });
};

export const createSubscriptionCheckout = async (
  priceId: string,
  userId: string,
  userEmail: string
): Promise<string> => {
  const baseUrl = window.location.origin;
  const successUrl = `${baseUrl}/?page=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/?page=pricing`;

  const session = await createCheckoutSession(
    priceId,
    userId,
    userEmail,
    successUrl,
    cancelUrl
  );

  return session.url;
};

export const getAvailableProducts = async (): Promise<PolarProduct[]> => {
  return await getProducts();
};

export const handleSuccessfulPayment = async (
  sessionId: string,
  userId: string
): Promise<void> => {
  // This would typically be called from a webhook or success page
  // For now, we'll implement basic subscription creation
  // In production, this should be handled by Polar webhooks
  
  try {
    // Create subscription record in Convex
    await convex.mutation(api.subscriptions.createSubscription, {
      userId,
      polarSubscriptionId: sessionId, // Temporary - should be actual subscription ID from webhook
      polarCustomerId: 'temp_customer', // Should come from webhook
      productId: 'temp_product', // Should come from webhook
      priceId: 'temp_price', // Should come from webhook
      status: 'active',
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      cancelAtPeriodEnd: false
    });

    // Update usage tracking to reflect subscription status
    await convex.mutation(api.usage.updateSubscriptionStatus, {
      userId,
      isSubscribed: true
    });
  } catch (error) {
    console.error('Failed to handle successful payment:', error);
    throw error;
  }
};
