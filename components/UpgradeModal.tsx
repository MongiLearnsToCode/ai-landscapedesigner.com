import React from 'react';
import { X, Zap, Check } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  redesignCount: number;
  remainingRedesigns: number;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  redesignCount,
  remainingRedesigns
}) => {
  const { navigateTo } = useApp();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    navigateTo('pricing');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="h-5 w-5 text-slate-500" />
        </button>

        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Zap className="h-8 w-8 text-orange-500" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Redesign Limit Reached
          </h2>
          
          <p className="text-slate-600 mb-6">
            You've used all {redesignCount} of your free redesigns. Upgrade to continue creating unlimited landscape designs!
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-slate-800 mb-3">With a paid plan, you get:</h3>
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm text-slate-700">Unlimited redesigns</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm text-slate-700">Priority processing</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm text-slate-700">Advanced customization</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm text-slate-700">High-resolution downloads</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors font-semibold"
            >
              View Plans
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
