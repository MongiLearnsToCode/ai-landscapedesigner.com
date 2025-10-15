import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { handleSuccessfulPayment } from '../services/polarService';
import { CheckCircle, LayoutDashboard, Loader, CreditCard, Calendar, Package } from 'lucide-react';
import confetti from 'canvas-confetti';

export const SuccessPage: React.FC = () => {
  const { user } = useUser();
  const { navigateTo } = useApp();
  const { addToast } = useToast();
  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [transactionData, setTransactionData] = useState<{
    planName: string;
    billingCycle: string;
    sessionId: string;
  } | null>(null);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleProceedToDesign = () => {
    triggerConfetti();
    setTimeout(() => {
      navigateTo('main', { triggerConfetti: true });
    }, 500);
  };

  useEffect(() => {
    const processPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      const planName = urlParams.get('plan') || 'Creator';

      if (!sessionId || !user) {
        setProcessing(false);
        return;
      }

      // Extract billing cycle from URL or determine from plan
      const billingCycle = urlParams.get('billing') || 'monthly';

      setTransactionData({ planName, billingCycle, sessionId });

      try {
        await handleSuccessfulPayment(sessionId, user.id, planName);
        setSuccess(true);
        addToast('Subscription activated successfully!', 'success');
      } catch (error) {
        console.error('Failed to process payment:', error);
        addToast('There was an issue processing your payment. Please contact support.', 'error');
      } finally {
        setProcessing(false);
      }
    };

    processPayment();
  }, [user, addToast]);

  if (processing) {
    return (
      <div className="w-full max-w-2xl mx-auto my-auto text-center flex flex-col items-center justify-center p-4">
        <div className="animate-spin mb-6">
          <Loader className="h-16 w-16 text-orange-500" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Processing Your Payment</h1>
        <p className="text-slate-600 mb-8">Please wait while we activate your subscription...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto my-auto text-center flex flex-col items-center justify-center p-4">
      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in-up {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
      `}</style>
      
      <div className="relative mb-6">
        <CheckCircle className="h-24 w-24 text-green-500 animate-scale-in" strokeWidth={1.5} />
      </div>
      
      <h2 className="text-4xl font-extrabold text-slate-900 sm:text-5xl animate-fade-in-up">
        Payment Successful!
      </h2>
      <p className="mt-4 text-lg text-slate-600 max-w-md mx-auto animate-fade-in-up delay-100">
        Thank you for subscribing! Your premium features are now active.
      </p>

      {/* Transaction Summary */}
      {transactionData && (
        <div className="mt-8 p-6 bg-white border border-slate-200 rounded-xl shadow-sm animate-fade-in-up delay-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Transaction Summary
          </h3>
          <div className="space-y-3 text-left">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <Package className="h-4 w-4" />
                Plan
              </span>
              <span className="font-medium text-slate-800 capitalize">{transactionData.planName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <Calendar className="h-4 w-4" />
                Billing
              </span>
              <span className="font-medium text-slate-800 capitalize">{transactionData.billingCycle}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Transaction ID</span>
              <span className="font-mono text-sm text-slate-800">{transactionData.sessionId.slice(-8)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Premium Features */}
      {success && (
        <div className="mt-8 p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 animate-fade-in-up delay-300">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Your Premium Benefits</h3>
          <ul className="text-left text-slate-700 space-y-2">
            <li>• Unlimited AI landscape redesigns</li>
            <li>• Access to all premium design styles</li>
            <li>• High-resolution image downloads</li>
            <li>• Priority customer support</li>
            <li>• Advanced editing tools</li>
          </ul>
        </div>
      )}

      {/* Proceed Button */}
      <div className="mt-10 animate-fade-in-up delay-300">
        <button
          onClick={handleProceedToDesign}
          className="w-full sm:w-auto h-12 flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transform hover:scale-105"
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Start Creating Amazing Designs</span>
        </button>
        <p className="mt-3 text-sm text-slate-500">
          Click to proceed to your design workspace
        </p>
      </div>
    </div>
  );
};