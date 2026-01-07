
import React, { useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle, AlertCircle, Snowflake } from 'lucide-react';
import { Notification } from '../types.ts';
import { triggerHaptic, trackNotificationDismissed } from '../utils.ts';

interface ToastProps {
  notification: Notification | null;
  onDismiss: () => void;
}

export const Toast = memo(({ notification, onDismiss }: ToastProps) => {
  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && notification) {
        trackNotificationDismissed(notification.type);
        onDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [notification, onDismiss]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        trackNotificationDismissed(notification.type);
        onDismiss();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.9 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          exit={{ opacity: 0, y: -100, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-24 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none"
        >
          <motion.div 
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.1 }}
            onDragEnd={(e, info) => {
              // Improved swipe threshold - increased from 50px to 80px for better mobile UX
              const threshold = 80;
              if (Math.abs(info.offset.y) > threshold) {
                if (notification) {
                  trackNotificationDismissed(notification.type);
                  // Announce dismissal to screen readers
                  const announcement = document.getElementById('action-feedback');
                  if (announcement) {
                    announcement.textContent = `Notification dismissed: ${notification.title}`;
                    setTimeout(() => {
                      if (announcement) announcement.textContent = '';
                    }, 1000);
                  }
                }
                triggerHaptic(); // Add haptic feedback for swipe dismissal
                onDismiss();
              }
            }}
            className="bg-[#0a1128]/90 backdrop-blur-md border border-teal-500/30 text-white px-5 py-3 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] flex items-center gap-4 max-w-sm w-full pointer-events-auto cursor-grab active:cursor-grabbing"
            role="alert"
            aria-live="assertive"
            aria-label={`${notification.type} notification: ${notification.title}`}
          >
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              ${notification.type === 'AI' ? 'bg-indigo-500/20 text-indigo-400' : 
                notification.type === 'STREAK' ? 'bg-amber-500/20 text-amber-500' : 
                notification.type === 'FREEZE' ? 'bg-cyan-500/20 text-cyan-400' :
                'bg-emerald-500/20 text-emerald-400'}
            `}>
              {notification.type === 'AI' ? <Sparkles size={20} /> : 
               notification.type === 'STREAK' ? <AlertCircle size={20} /> : 
               notification.type === 'FREEZE' ? <Snowflake size={20} /> :
               <CheckCircle size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm font-outfit truncate">{notification.title}</h4>
              <p className="text-xs text-white/50 truncate">{notification.message}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
