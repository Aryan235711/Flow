
import React, { memo } from 'react';
import { Bell, User } from 'lucide-react';
import { UserProfile } from '../types.ts';
import { FlowLogo } from './FlowLogo.tsx';

interface HeaderProps {
  user: UserProfile;
  unreadCount: number;
  onOpenNotifs: () => void;
  onOpenProfile: () => void;
}

export const Header = memo(({ user, unreadCount, onOpenNotifs, onOpenProfile }: HeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
      <div className="max-w-6xl mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* Logo Mark */}
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-[14px] bg-white/5 flex items-center justify-center shadow-lg border border-white/5">
              <FlowLogo className="w-full h-full p-1.5" />
          </div>
          {/* App Name */}
          <h1 className="text-3xl md:text-4xl font-black font-outfit tracking-tighter bg-gradient-to-r from-white via-teal-100 to-teal-400 bg-clip-text text-transparent drop-shadow-sm">
            Flow
          </h1>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onOpenNotifs} 
            aria-label="Notifications" 
            className="w-11 h-11 md:w-14 md:h-14 glass rounded-xl md:rounded-[14px] flex items-center justify-center relative border-white/10 active:scale-90 transition-all hover:bg-white/5 touch-manipulation"
          >
            <Bell size={20} className="text-white/80" />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500 border border-[#020617]"></span>
              </span>
            )}
          </button>
          
          <button 
            onClick={onOpenProfile} 
            aria-label="Profile" 
            className="w-11 h-11 md:w-14 md:h-14 glass rounded-xl md:rounded-[14px] border-white/10 overflow-hidden p-0.5 active:scale-90 transition-all hover:bg-white/5 touch-manipulation relative"
          >
            <div className="w-full h-full rounded-[10px] bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center overflow-hidden">
              {user.picture ? (
                <img src={user.picture} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={18} className="text-white" />
              )}
            </div>
            {/* PRO BADGE DOT */}
            {user.isPremium && (
              <div className="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full border-2 border-[#020617] shadow-[0_0_10px_#f59e0b]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
});
