import React from 'react';
import { Zap, Crown } from 'lucide-react';

interface UsageDisplayProps {
  redesignCount: number;
  remainingRedesigns: number;
  isSubscribed: boolean;
  className?: string;
}

export const UsageDisplay: React.FC<UsageDisplayProps> = ({
  redesignCount,
  remainingRedesigns,
  isSubscribed,
  className = ''
}) => {
  if (isSubscribed) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Crown className="h-4 w-4 text-yellow-500" />
        <span className="text-slate-600">Unlimited redesigns</span>
      </div>
    );
  }

  const isLimitReached = remainingRedesigns === 0;
  const isNearLimit = remainingRedesigns <= 1;

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <Zap className={`h-4 w-4 ${isLimitReached ? 'text-red-500' : isNearLimit ? 'text-orange-500' : 'text-green-500'}`} />
      <span className={`${isLimitReached ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-slate-600'}`}>
        {isLimitReached 
          ? 'No redesigns remaining' 
          : `${remainingRedesigns} redesign${remainingRedesigns === 1 ? '' : 's'} remaining`
        }
      </span>
    </div>
  );
};
