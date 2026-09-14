import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Building2,
  Package,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  Users,
  Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { NotificationItem, User } from '../types';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenAuthModal?: () => void;
  onOpenLogin?: () => void;
  onNavigate?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenAuthModal,
  onOpenLogin,
  onNavigate
}) => {
  const { currentUser, logout, setUserQuickly } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async () => {
    try {
      const list = await api.getNotifications({
        userId: currentUser?.id,
        role: currentUser?.role
      });
      setNotifications(list);
    } catch {
      // ignore
    }
  };

  const fetchUsers = async () => {
    try {
      const users = await api.getUsers();
      setAllUsers(users);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifs();
    fetchUsers();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // ignore
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left branding and mobile toggle */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-sidebar-toggle"
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => onNavigate?.(currentUser?.role === 'Admin' ? 'admin-dashboard' : currentUser?.role === 'Warehouse Manager' ? 'manager-dashboard' : 'dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  SmartWarehouse
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-600 hidden sm:block">
                Smart Inventory &amp; Warehouse System
              </p>
            </div>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {currentUser ? (
            <>
              {/* Quick Switch User Button (helpful for testing multi-role workflows) */}
              <button
                id="switch-user-btn"
                onClick={() => {
                  fetchUsers();
                  setShowSwitchModal(true);
                }}
                className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                title="Switch between registered accounts"
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Switch Account ({allUsers.length})</span>
              </button>

              {/* Notifications Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  id="notifications-toggle"
                  type="button"
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none transition-colors"
                  aria-label="View notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm text-slate-900">Notifications</span>
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700 rounded-full">
                          {unreadCount} unread
                        </span>
                      </div>
                      {notifications.length > 0 && (
                        <button
                          onClick={() => {
                            notifications.forEach(n => {
                              if (!n.read) handleMarkAsRead(n.id);
                            });
                          }}
                          className="text-[11px] text-blue-600 hover:underline font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center px-4">
                          <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 font-medium">No notifications yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Stock alerts, booking status, and system notices will show here.
                          </p>
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                            className={`p-3 text-left transition-colors flex items-start gap-2.5 cursor-pointer hover:bg-slate-50 ${
                              notif.read ? 'opacity-70 bg-white' : 'bg-blue-50/40'
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              {notif.type === 'alert' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                              {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                              {notif.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                              {notif.type === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-slate-900 truncate">{notif.title}</h4>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  id="user-profile-menu-toggle"
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[120px]">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-blue-600 font-medium">
                      {currentUser.role}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <p className="text-xs font-semibold text-slate-900">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                        <ShieldCheck className="w-3 h-3" />
                        Role: {currentUser.role}
                      </div>
                    </div>

                    <div className="p-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowSwitchModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg text-left"
                      >
                        <Users className="w-4 h-4 text-slate-500" />
                        Switch or View Accounts
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg text-left font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="header-login-btn"
                onClick={onOpenAuthModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5" />
                Sign In / Register
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Switch Account Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Switch Registered Account</h3>
                <p className="text-xs text-slate-500">Easily test Admin, Manager, and Client roles</p>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-semibold"
              >
                &times;
              </button>
            </div>

            <div className="p-5 max-h-80 overflow-y-auto divide-y divide-slate-100">
              {allUsers.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <p>No registered accounts found in the database.</p>
                  <p className="mt-1 text-slate-400">Register a new user to test the system.</p>
                </div>
              ) : (
                allUsers.map(u => (
                  <div
                    key={u.id}
                    className={`py-3 flex items-center justify-between rounded-lg px-2 hover:bg-slate-50 transition-colors ${
                      currentUser?.id === u.id ? 'bg-blue-50/70' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                          <span>{u.name}</span>
                          {currentUser?.id === u.id && (
                            <span className="text-[10px] text-blue-600 font-bold bg-blue-100 px-1.5 py-0.2 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{u.email}</div>
                        <div className="text-[10px] font-semibold text-slate-600 mt-0.5">
                          Role: <span className="text-blue-700 font-bold">{u.role}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setUserQuickly(u);
                        setShowSwitchModal(false);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200"
                    >
                      {currentUser?.id === u.id ? 'Active' : 'Switch'}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => {
                  setShowSwitchModal(false);
                  onOpenAuthModal?.();
                }}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                + Register Another User
              </button>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
