import { Polar } from '@polar-sh/sdk';

const polar = new Polar({
  accessToken: import.meta.env.VITE_POLAR_ACCESS_TOKEN,
  server: 'sandbox'
});

const getPriceId = (planName: string, billingCycle: 'monthly' | 'annual'): string => {
  const envKey = `VITE_POLAR_${planName.toUpperCase()}_${billingCycle.toUpperCase()}_PRICE_ID`;
  const priceId = import.meta.env[envKey];
  
  if (!priceId) {
    throw new Error(`Price ID not found for ${planName} ${billingCycle}. Check environment variable: ${envKey}`);
  }
  
  return priceId;
};

export const createCheckoutSession = async (
  planName: string,
  billingCycle: 'monthly' | 'annual',
  userId: string,
  userEmail: string
): Promise<string> => {
  try {
    const baseUrl = window.location.origin;
    const successUrl = `${baseUrl}/?page=success&session_id={CHECKOUT_SESSION_ID}&plan=${planName}`;
    const cancelUrl = `${baseUrl}/?page=pricing`;

    const priceId = getPriceId(planName, billingCycle);

    const response = await polar.checkouts.create({
      products: [
        {
          priceId,
          quantity: 1
        }
      ],
      successUrl,
      customerEmail: userEmail,
      metadata: {
        userId,
        planName,
        billingCycle,
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

  await convex.mutation(api.usage.updateSubscriptionStatus, {
    userId,
    isSubscribed: true
  });
};
