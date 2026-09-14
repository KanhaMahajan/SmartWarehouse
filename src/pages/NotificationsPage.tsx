import React, { useState, useEffect } from 'react';
import { NotificationItem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  CheckCheck
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.getNotifications({
        userId: currentUser?.id,
        role: currentUser?.role
      });
      setNotifications(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [currentUser]);

  const handleMarkAllRead = async () => {
    try {
      await Promise.all(
        notifications.filter(n => !n.read).map(n => api.markNotificationRead(n.id))
      );
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const handleMarkOne = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-blue-600" />
            Alerts &amp; Notifications
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time notifications for stock thresholds, warehouse capacity warnings, and booking decisions.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Notifications</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You're all caught up. Notifications will be generated automatically when stock moves or updates occur.
            </p>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => !notif.read && handleMarkOne(notif.id)}
              className={`p-4 sm:p-5 flex items-start gap-4 transition-colors cursor-pointer hover:bg-slate-50 ${
                notif.read ? 'bg-white' : 'bg-blue-50/30'
              }`}
            >
              <div className="mt-1 shrink-0">
                {notif.type === 'alert' && (
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
                {notif.type === 'warning' && (
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
                {notif.type === 'success' && (
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                {notif.type === 'info' && (
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
