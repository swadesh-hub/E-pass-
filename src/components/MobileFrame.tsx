import React from 'react';
import { Wifi, Battery } from 'lucide-react';

interface MobileFrameProps {
  isMobileMode: boolean;
  onToggleMode: () => void;
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  isMobileMode,
  children,
}) => {
  if (!isMobileMode) {
    return <div className="w-full min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-2 sm:p-6">
      {/* Phone Hardware Mockup Shell */}
      <div className="relative w-full max-w-[420px] h-[92vh] max-h-[880px] bg-slate-900 border-[8px] sm:border-[12px] border-slate-800 rounded-[48px] shadow-2xl shadow-slate-400/30 flex flex-col overflow-hidden ring-1 ring-slate-400">
        {/* Dynamic Island & Status Bar */}
        <div className="h-11 px-6 bg-white flex items-center justify-between text-slate-900 shrink-0 select-none z-30 border-b border-slate-100">
          <span className="text-[12px] font-bold tracking-tight">09:41</span>

          {/* Dynamic Island pill */}
          <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center shadow-inner">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-2" />
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          </div>

          <div className="flex items-center gap-1.5 text-slate-700">
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4 text-emerald-600" />
          </div>
        </div>

        {/* Scrollable Viewport Content inside phone */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 flex flex-col">
          {children}
        </div>

        {/* Phone Bottom Home Indicator */}
        <div className="h-4 bg-white flex items-center justify-center shrink-0 border-t border-slate-100">
          <div className="w-32 h-1 bg-slate-300 rounded-full" />
        </div>
      </div>
    </div>
  );
};
