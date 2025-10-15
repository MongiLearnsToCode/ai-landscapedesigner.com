import React, { useState } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { User, DollarSign, LogOut, AlertTriangle } from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80">
    <div className="p-6 border-b border-slate-200/80">
      <h3 className="text-xl font-bold text-slate-800">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="text-base text-slate-800">{value}</p>
  </div>
);

const ClerkProfilePlaceholder: React.FC = () => {
  const { user } = useUser();
  if (!user) return null;

  return (
    <Section title="Profile & Security">
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
        <h4 className="font-bold text-slate-800">Profile Management</h4>
        <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
          Your profile is managed by Clerk. To update your information, use the user menu in the header.
        </p>
      </div>
      <div className="mt-6 flex items-center gap-6">
        <img src={user.imageUrl} alt="User avatar" className="h-20 w-20 rounded-full ring-4 ring-white shadow-md" />
        <div className="space-y-4">
          <InfoRow label="Full Name" value={user.fullName || 'Not provided'} />
          <InfoRow label="Email Address" value={user.primaryEmailAddress?.emailAddress || 'Not provided'} />
        </div>
      </div>
    </Section>
  );
};

const SubscriptionContent: React.FC = () => {
  const { navigateTo } = useApp();
  const { addToast } = useToast();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const handleConfirmCancel = () => {
    addToast('Subscription management coming soon!', 'info');
    setIsCancelModalOpen(false);
  };

  return (
    <>
      <Section title="My Subscription">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <p className="text-base font-semibold text-slate-800">Free Plan</p>
              <p className="text-sm text-slate-500">Subscription management coming soon</p>
            </div>
            <span className="mt-2 sm:mt-0 capitalize text-sm font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">Active</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
            <button onClick={() => navigateTo('pricing')} className="px-4 py-2 text-sm font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors">View Plans</button>
          </div>
        </div>
      </Section>
    </>
  );
};

const AccountContent: React.FC<{ onDelete: () => void }> = ({ onDelete }) => {
  return (
    <Section title="Danger Zone">
      <div className="bg-red-50 p-4 rounded-xl border border-red-200">
        <h4 className="font-bold text-red-800">Delete Your Account</h4>
        <p className="mt-1 text-sm text-red-700">
          Account deletion is managed through Clerk. Contact support for assistance with account deletion.
        </p>
      </div>
    </Section>
  );
};

export const ProfilePage: React.FC = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { addToast } = useToast();

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8">
      <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-800">Account Settings</h2>
          <p className="text-slate-500 mt-1">Manage your profile, subscription, and account settings.</p>
      </div>
      
      <ClerkProfilePlaceholder />
      
      <SubscriptionContent />
      
      <AccountContent onDelete={() => {}} />
      
      <div className="pt-4 text-center border-t border-slate-200/80">
          <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 hover:text-slate-800 transition-colors flex items-center mx-auto"
          >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
          </button>
      </div>
    </div>
  );
};