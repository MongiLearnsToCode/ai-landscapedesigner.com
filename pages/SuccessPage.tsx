import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { handleSuccessfulPayment } from '../services/polarService';
import { CheckCircle, LayoutDashboard, User, Loader } from 'lucide-react';

export const SuccessPage: React.FC = () => {
  const { user } = useUser();
  const { navigateTo } = useApp();
  const { addToast } = useToast();
  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const processPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      const planName = urlParams.get('plan') || 'Creator'; // Default plan

      if (!sessionId || !user) {
        setProcessing(false);
        return;
      }

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
        {success ? 'Welcome to Premium!' : 'Payment Successful!'}
      </h2>
      <p className="mt-4 text-lg text-slate-600 max-w-md mx-auto animate-fade-in-up delay-100">
        {success 
          ? 'Your subscription has been activated. You now have unlimited access to all premium features!'
          : 'Thank you for your purchase. Your account will be updated shortly.'
        }
      </p>

      <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-fade-in-up delay-200">
        <button
          onClick={() => navigateTo('main')}
          className="w-full sm:w-auto h-11 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Start Designing</span>
        </button>
        <button
          onClick={() => navigateTo('profile')}
          className="w-full sm:w-auto h-11 flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          <User className="h-5 w-5" />
          <span>View Profile</span>
        </button>
      </div>

      {success && (
        <div className="mt-12 p-6 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in-up delay-300">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">What's Next?</h3>
          <ul className="text-left text-slate-600 space-y-2">
            <li>• Upload unlimited property images</li>
            <li>• Generate unlimited AI redesigns</li>
            <li>• Access all premium landscape styles</li>
            <li>• Download high-resolution images</li>
            <li>• Get priority customer support</li>
          </ul>
        </div>
      )}
    </div>
  );
};