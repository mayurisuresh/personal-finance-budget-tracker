import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, AlertTriangle, AlertCircle, Info, Trash2, Check } from 'lucide-react';
import api from '../services/api';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/dismiss`);
      setNotifications(notifications.filter(n => n._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = notifications.filter(n => {
    if (filterType === 'unread') return !n.isRead;
    if (filterType === 'critical') return n.severity === 'critical';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Overspending Alerts & Advisory Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Deterministic rule-based anomaly detection · Real-time ledger monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs w-fit">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            filterType === 'all'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-semibold'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilterType('unread')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            filterType === 'unread'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-semibold'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Unread ({notifications.filter(n => !n.isRead).length})
        </button>
        <button
          onClick={() => setFilterType('critical')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            filterType === 'critical'
              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-semibold'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Critical ({notifications.filter(n => n.severity === 'critical').length})
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map(item => {
            const isCritical = item.severity === 'critical';
            const isWarning = item.severity === 'warning';

            return (
              <div
                key={item._id}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                  !item.isRead
                    ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 shadow-2xs'
                    : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-90'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                      isCritical
                        ? 'bg-red-50 dark:bg-red-950/60 text-red-600'
                        : isWarning
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600'
                    }`}
                  >
                    {isCritical ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h2>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                        {item.type.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{item.message}</p>

                    <div className="text-[11px] text-slate-400 mt-2 font-mono">
                      Timestamp: {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!item.isRead && (
                    <button
                      onClick={() => handleMarkRead(item._id)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDismiss(item._id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Dismiss alert"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-xs text-slate-400">
            No active alerts matching this filter. All financial indicators and spending limits are nominal.
          </div>
        )}
      </div>
    </div>
  );
};
