import React, { useState } from 'react';
import { useUser, useClerk, UserProfile } from '@clerk/clerk-react';
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

const SubscriptionContent: React.FC = () => {
  const { navigateTo } = useApp();

  return (
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
  );
};

export const ProfilePage: React.FC = () => {
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8">
      <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-800">Account Settings</h2>
          <p className="text-slate-500 mt-1">Manage your profile, subscription, and account settings.</p>
      </div>
      
      <Section title="Profile & Security">
        <div className="flex justify-center">
          <UserProfile />
        </div>
      </Section>
      
      <SubscriptionContent />
      
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