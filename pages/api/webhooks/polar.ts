import { ConvexReactClient } from "convex/react";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL!);

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'Webhook endpoint active' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;

    // Verify webhook signature (implement based on Polar's webhook security)
    // const signature = req.headers['polar-signature'];
    // if (!verifySignature(signature, req.body)) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    switch (event.type) {
      case 'checkout.updated':
        console.log('Checkout updated:', event.data);
        break;

      case 'order.created':
        console.log('Order created:', event.data);
        break;

      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionUpdate(event.data);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCancellation(event.data);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailure(event.data);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleSubscriptionUpdate(subscription: any) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  await convex.mutation(api.subscriptions.createSubscription, {
    userId,
    polarSubscriptionId: subscription.id,
    polarCustomerId: subscription.customer_id,
    status: subscription.status,
    planName: subscription.metadata?.planName || 'Unknown',
    billingCycle: subscription.metadata?.billingCycle,
    currentPeriodStart: subscription.current_period_start * 1000,
    currentPeriodEnd: subscription.current_period_end * 1000,
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });

  await convex.mutation(api.usage.updateSubscriptionStatus, {
    userId,
    isSubscribed: subscription.status === 'active'
  });
}

async function handleSubscriptionCancellation(subscription: any) {
  await convex.mutation(api.subscriptions.updateSubscriptionStatus, {
    polarSubscriptionId: subscription.id,
    status: 'canceled',
    cancelAtPeriodEnd: true
  });
}

async function handlePaymentSuccess(invoice: any) {
  // Handle successful payment - could trigger usage reset, etc.
  console.log('Payment succeeded:', invoice.id);
}

async function handlePaymentFailure(invoice: any) {
  // Handle failed payment - could pause subscription, send notifications, etc.
  console.log('Payment failed:', invoice.id);
}