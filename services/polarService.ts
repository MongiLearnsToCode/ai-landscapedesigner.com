import { Polar } from '@polar-sh/sdk';

const polar = new Polar({
  accessToken: import.meta.env.VITE_POLAR_ACCESS_TOKEN,
  server: 'sandbox'
});

export const createCheckoutSession = async (
  planName: string,
  userId: string,
  userEmail: string
): Promise<string> => {
  try {
    const baseUrl = window.location.origin;
    const successUrl = `${baseUrl}/?page=success&session_id={CHECKOUT_SESSION_ID}&plan=${planName}`;
    const cancelUrl = `${baseUrl}/?page=pricing`;

    // Create checkout with products array structure
    const response = await polar.checkouts.create({
      products: [
        {
          priceId: 'test_price_id', // Replace with actual price ID from Polar
          quantity: 1
        }
      ],
      successUrl,
      customerEmail: userEmail,
      metadata: {
        userId,
        planName,
        source: 'ai-landscape-designer'
      }
    });

    return response.url;
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    throw new Error('Failed to create checkout session');
  }
};

export const handleSuccessfulPayment = async (
  sessionId: string,
  userId: string,
  planName: string
): Promise<void> => {
  // In production, this would be handled by webhooks
  // For sandbox testing, we'll simulate the subscription creation
  const { ConvexReactClient } = await import('convex/react');
  const { api } = await import('../convex/_generated/api');
  
  const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);
  
  await convex.mutation(api.subscriptions.createSubscription, {
    userId,
    polarSubscriptionId: sessionId,
    status: 'active',
    planName,
    currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
  });

  // Update usage tracking
  await convex.mutation(api.usage.updateSubscriptionStatus, {
    userId,
    isSubscribed: true
  });
};
