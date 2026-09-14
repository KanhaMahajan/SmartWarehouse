import React from 'react';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  Building2,
  CalendarCheck,
  ArrowLeftRight,
  Bell,
  Users,
  ShieldCheck,
  BarChart3,
  Boxes,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeAlert?: boolean;
  highlight?: boolean;
}

interface SidebarProps {
  activeTab?: string;
  currentTab?: string;
  onSelectTab: (tab: string) => void;
  isOpen?: boolean;
  onCloseMobile?: () => void;
  counts?: {
    inventoryCount?: number;
    warehousesCount?: number;
    bookingsCount?: number;
    pendingBookingsCount?: number;
    lowStockCount?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  currentTab,
  onSelectTab,
  isOpen = false,
  onCloseMobile = () => {},
  counts
}) => {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'User';
  const selectedTab = activeTab || currentTab || 'dashboard';

  const userNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'My Inventory', icon: Package, badge: counts?.inventoryCount },
    { id: 'warehouses', label: 'Available Warehouses', icon: Building2, badge: counts?.warehousesCount },
    { id: 'bookings', label: 'My Bookings', icon: CalendarCheck, badge: counts?.bookingsCount },
    { id: 'movements', label: 'Stock Movements', icon: ArrowLeftRight },
    { id: 'notifications', label: 'Alerts & Notices', icon: Bell }
  ];

  const managerNavItems: NavItem[] = [
    { id: 'manager-operations', label: 'Facility Operations', icon: Building2 },
    { id: 'inventory', label: 'Inventory Stored', icon: Boxes, badge: counts?.inventoryCount },
    { id: 'movements', label: 'Stock In / Out Ledger', icon: ArrowLeftRight },
    { id: 'notifications', label: 'Alerts & Notices', icon: Bell }
  ];

  const adminNavItems: NavItem[] = [
    { id: 'admin-dashboard', label: 'System Overview', icon: LayoutDashboard },
    { id: 'admin-warehouses', label: 'Warehouse Facilities', icon: Building2, badge: counts?.warehousesCount },
    {
      id: 'admin-bookings',
      label: 'Booking Approvals',
      icon: CalendarCheck,
      badge: counts?.pendingBookingsCount,
      badgeAlert: (counts?.pendingBookingsCount || 0) > 0
    },
    { id: 'admin-inventory', label: 'Master Inventory', icon: Package, badge: counts?.inventoryCount },
    { id: 'admin-users', label: 'User Directory', icon: Users },
    { id: 'admin-reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'movements', label: 'Global Audit Trail', icon: ArrowLeftRight }
  ];

  const currentNavItems =
    role === 'Admin' ? adminNavItems : role === 'Warehouse Manager' ? managerNavItems : userNavItems;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between ${
          isOpen ? 'fixed top-20 bottom-6 left-4 z-50 w-64 shadow-2xl md:static md:w-auto md:shadow-xs' : ''
        }`}
      >
        <div className="space-y-5">
          {/* User role status card */}
          {currentUser && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Current Role
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    role === 'Admin'
                      ? 'bg-blue-100 text-blue-800'
                      : role === 'Warehouse Manager'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {role}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 mt-1 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
            </div>
          )}

          {/* Nav Items */}
          <div>
            <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
            <nav className="space-y-1">
              {currentNavItems.map(item => {
                const Icon = item.icon;
                const isActive = selectedTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-link-${item.id}`}
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : item.highlight
                        ? 'text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-blue-600' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge !== null && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badgeAlert
                            ? 'bg-rose-100 text-rose-700 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Dynamic platform notice */}
        <div className="pt-4 mt-6 border-t border-slate-100">
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100/80 text-[11px] text-blue-900 leading-relaxed">
            <div className="font-bold flex items-center gap-1 text-blue-700 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Dynamic System
            </div>
            Data created via forms is saved immediately in the live backend.
          </div>
        </div>
      </aside>
    </>
  );
};
