import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, Target, X } from 'lucide-react';
import { getNotificationAnalytics, NotificationAnalytics } from '../utils';

interface AnalyticsDashboardProps {
  onClose: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const analytics = useMemo(() => getNotificationAnalytics(), []);

  const engagementRate = useMemo(() => {
    if (analytics.totalShown === 0) return 0;
    return Math.round((analytics.totalRead / analytics.totalShown) * 100);
  }, [analytics]);

  const dismissalRate = useMemo(() => {
    if (analytics.totalShown === 0) return 0;
    return Math.round((analytics.totalDismissed / analytics.totalShown) * 100);
  }, [analytics]);

  const typeData = useMemo(() => {
    return Object.entries(analytics.typeBreakdown).map(([type, data]) => ({
      type,
      ...data,
      engagement: data.shown > 0 ? Math.round((data.read / data.shown) * 100) : 0
    }));
  }, [analytics.typeBreakdown]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-[#020617]/95 backdrop-blur-xl p-6 overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black font-outfit text-white">Analytics</h1>
            <p className="text-teal-300/60 text-sm">Notification engagement insights</p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Shown"
            value={analytics.totalShown}
            icon={BarChart3}
            color="text-teal-400"
          />
          <MetricCard
            title="Engagement Rate"
            value={`${engagementRate}%`}
            icon={Target}
            color="text-emerald-400"
          />
          <MetricCard
            title="Dismissal Rate"
            value={`${dismissalRate}%`}
            icon={TrendingUp}
            color="text-amber-400"
          />
          <MetricCard
            title="Avg Time"
            value={`${analytics.avgTimeToDismiss}s`}
            icon={Clock}
            color="text-cyan-400"
          />
        </div>

        <div className="glass rounded-[32px] p-8 border-white/5">
          <h2 className="text-xl font-bold font-outfit text-white mb-6">Notification Types</h2>
          <div className="space-y-4">
            {typeData.map(({ type, shown, read, dismissed, engagement }) => (
              <div key={type} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    type === 'AI' ? 'bg-indigo-500' :
                    type === 'SYSTEM' ? 'bg-emerald-500' :
                    type === 'STREAK' ? 'bg-amber-500' : 'bg-cyan-500'
                  }`} />
                  <span className="font-bold text-white">{type}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-white/60">Shown: {shown}</span>
                  <span className="text-white/60">Read: {read}</span>
                  <span className="text-white/60">Dismissed: {dismissed}</span>
                  <span className={`font-bold ${engagement > 70 ? 'text-emerald-400' : engagement > 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {engagement}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}> = ({ title, value, icon: Icon, color }) => (
  <div className="glass rounded-[24px] p-6 border-white/5">
    <div className="flex items-center gap-3 mb-3">
      <Icon size={20} className={color} />
      <span className="text-xs font-bold text-white/60 uppercase tracking-widest">{title}</span>
    </div>
    <div className={`text-2xl font-black font-outfit ${color}`}>{value}</div>
  </div>
);