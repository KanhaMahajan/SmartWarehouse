import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { AddInventoryModal } from './components/AddInventoryModal';
import { BookWarehouseModal } from './components/BookWarehouseModal';
import { AddWarehouseModal } from './components/AddWarehouseModal';
import { AddUserModal } from './components/AddUserModal';
import { StockMovementModal } from './components/StockMovementModal';

import { UserDashboard } from './pages/UserDashboard';
import { MyInventoryPage } from './pages/MyInventoryPage';
import { AvailableWarehousesPage } from './pages/AvailableWarehousesPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { StockMovementsPage } from './pages/StockMovementsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { WarehouseManagerView } from './pages/WarehouseManagerView';
import { AdminDashboard } from './pages/AdminDashboard';
import { api } from './services/api';

import {
  InventoryItem,
  Warehouse,
  User,
  Role
} from './types';
import {
  Package,
  Building2,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Boxes,
  PlusCircle,
  Lock,
  ShieldAlert
} from 'lucide-react';

const ROLE_ALLOWED_TABS: Record<Role, string[]> = {
  Admin: [
    'admin-dashboard',
    'admin-warehouses',
    'admin-bookings',
    'admin-inventory',
    'admin-users',
    'admin-reports',
    'movements',
    'notifications'
  ],
  'Warehouse Manager': [
    'manager-operations',
    'inventory',
    'movements',
    'notifications'
  ],
  User: [
    'dashboard',
    'inventory',
    'warehouses',
    'bookings',
    'movements',
    'notifications'
  ]
};

const ROLE_DEFAULT_TAB: Record<Role, string> = {
  Admin: 'admin-dashboard',
  'Warehouse Manager': 'manager-operations',
  User: 'dashboard'
};

const MainLayout: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [accessDeniedNotice, setAccessDeniedNotice] = useState<{
    attemptedTab: string;
    userRole: string;
  } | null>(null);

  // Modal triggers
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot'>('login');

  const [addInventoryOpen, setAddInventoryOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);

  const [bookWarehouseOpen, setBookWarehouseOpen] = useState(false);
  const [selectedWarehouseForBooking, setSelectedWarehouseForBooking] = useState<Warehouse | null>(null);

  const [addWarehouseOpen, setAddWarehouseOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [stockMovementOpen, setStockMovementOpen] = useState(false);
  const [preSelectedMovementItem, setPreSelectedMovementItem] = useState<InventoryItem | null>(null);

  // Enforce role-based access control navigation
  const navigateToTab = (targetTab: string, isFromUrl: boolean = false) => {
    if (!currentUser) {
      setActiveTab(targetTab);
      return;
    }

    const role = currentUser.role || 'User';
    const allowed = ROLE_ALLOWED_TABS[role] || [];

    if (!allowed.includes(targetTab)) {
      // Access Denied: Automatically redirect to role's authorized home dashboard
      const fallbackTab = ROLE_DEFAULT_TAB[role] || 'dashboard';
      setAccessDeniedNotice({
        attemptedTab: targetTab,
        userRole: role
      });
      setActiveTab(fallbackTab);
      window.location.hash = fallbackTab;
      return;
    }

    setAccessDeniedNotice(null);
    setActiveTab(targetTab);
    if (!isFromUrl && window.location.hash !== `#${targetTab}`) {
      window.location.hash = targetTab;
    }
  };

  // Sync with URL hash and address bar changes
  useEffect(() => {
    if (!currentUser) return;

    const handleHashSync = () => {
      const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (rawHash) {
        navigateToTab(rawHash, true);
      } else {
        const defaultTab = ROLE_DEFAULT_TAB[currentUser.role] || 'dashboard';
        navigateToTab(defaultTab, false);
      }
    };

    handleHashSync();
    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, [currentUser?.role, currentUser?.id]);

  // Quick helper handlers with permission gating
  const handleOpenLogin = () => {
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  const handleOpenRegister = () => {
    setAuthModalMode('register');
    setAuthModalOpen(true);
  };

  const handleOpenAddInventory = (item?: InventoryItem) => {
    setEditingInventory(item || null);
    setAddInventoryOpen(true);
  };

  const handleOpenBookWarehouse = (wh?: Warehouse) => {
    if (currentUser?.role !== 'User') {
      setAccessDeniedNotice({
        attemptedTab: 'Book Storage Space (Client Users Only)',
        userRole: currentUser?.role || 'Guest'
      });
      return;
    }
    setSelectedWarehouseForBooking(wh || null);
    setBookWarehouseOpen(true);
  };

  const handleOpenAddWarehouse = (wh?: Warehouse) => {
    if (currentUser?.role !== 'Admin') {
      setAccessDeniedNotice({
        attemptedTab: 'Add Warehouse (Admin Only)',
        userRole: currentUser?.role || 'Guest'
      });
      return;
    }
    setEditingWarehouse(wh || null);
    setAddWarehouseOpen(true);
  };

  const handleOpenAddUser = (user?: User) => {
    if (currentUser?.role !== 'Admin') {
      setAccessDeniedNotice({
        attemptedTab: 'User Provisioning (Admin Only)',
        userRole: currentUser?.role || 'Guest'
      });
      return;
    }
    setEditingUser(user || null);
    setAddUserOpen(true);
  };

  const handleOpenStockMovement = (item?: InventoryItem) => {
    if (currentUser?.role === 'User') {
      setAccessDeniedNotice({
        attemptedTab: 'Stock Movements (Manager/Admin Only)',
        userRole: 'User'
      });
      return;
    }
    setPreSelectedMovementItem(item || null);
    setStockMovementOpen(true);
  };

  // If user is not logged in: display a pristine guest landing interface with quick Register/Login options
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-800">
        {/* Guest Nav */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-slate-900 tracking-tight">Smart Inventory</span>
              <span className="text-xs text-blue-600 font-bold block -mt-1">&amp; Warehouse Management</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="guest-nav-login-btn"
              onClick={handleOpenLogin}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 rounded-xl transition-colors"
            >
              Sign In
            </button>
            <button
              id="guest-nav-register-btn"
              onClick={handleOpenRegister}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-blue-500/20 flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              Register New Account
            </button>
          </div>
        </header>

        {/* Hero / Portal Entry */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              <ShieldCheck className="w-3.5 h-3.5" />
              Dynamic Multi-Role Enterprise Management System
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Smart Inventory &amp; Warehouse Management
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg mx-auto">
              Real-time stock tracking, barcode identifiers, dynamic facility space reservations,
              and strict role-based access for Administrators, Warehouse Managers, and Client Users.
            </p>

            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-left space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                Get Started
              </h2>
              <p className="text-xs text-slate-500">
                This system operates with completely dynamic live data. Register your profile to start adding inventory and booking storage space, or sign in to an existing role.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  id="hero-register-btn"
                  onClick={handleOpenRegister}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  Register as User
                </button>
                <button
                  id="hero-login-btn"
                  onClick={handleOpenLogin}
                  className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Sign In with Credentials
                </button>
              </div>
            </div>

            {/* Role Features Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs mb-2">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Client Users</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Add items, SKU, weight, barcode, check low-stock thresholds, and book storage space.
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs mb-2">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Warehouse Managers</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Manage assigned facility capacity, approve incoming items, and record Stock In/Stock Out.
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs mb-2">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Administrators</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Create warehouse facilities, manage users and roles, approve bookings, and view Recharts analytics.
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200">
          Smart Inventory and Warehouse Management System • Dynamic Data Platform
        </footer>

        {/* Authentication Modal */}
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
        />
      </div>
    );
  }

  // Authenticated Dashboard Layout
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Top Navbar */}
      <Navbar
        onNavigate={tab => navigateToTab(tab)}
        onOpenLogin={handleOpenLogin}
      />

      <div className="flex-1 flex w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Role-Based Sidebar */}
        <div className="w-64 shrink-0 hidden md:block">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={tab => navigateToTab(tab)}
          />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* Strict Role Access Denied Notification Banner */}
          {accessDeniedNotice && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start justify-between text-rose-800 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                    Access Denied — Role Protection Active
                  </h4>
                  <p className="text-xs mt-0.5 text-rose-700 leading-relaxed">
                    Your account role (<span className="font-bold">{accessDeniedNotice.userRole}</span>) is strictly prohibited from accessing <code className="px-1.5 py-0.5 bg-rose-100 rounded text-[11px] font-mono font-bold">#{accessDeniedNotice.attemptedTab}</code>.
                    You have been automatically returned to your authorized role dashboard.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAccessDeniedNotice(null)}
                className="text-rose-500 hover:text-rose-800 text-sm font-bold ml-4 p-1"
                aria-label="Dismiss access denied notification"
              >
                &times;
              </button>
            </div>
          )}

          {/* USER-ONLY VIEWS */}
          {currentUser.role === 'User' && (
            <>
              {activeTab === 'dashboard' && (
                <UserDashboard
                  onNavigate={tab => navigateToTab(tab)}
                  onOpenAddInventory={() => handleOpenAddInventory()}
                  onOpenBookWarehouse={wh => handleOpenBookWarehouse(wh)}
                />
              )}

              {activeTab === 'inventory' && (
                <MyInventoryPage
                  onOpenAddInventory={item => handleOpenAddInventory(item)}
                  onOpenBookWarehouse={() => handleOpenBookWarehouse()}
                />
              )}

              {activeTab === 'warehouses' && (
                <AvailableWarehousesPage
                  onOpenBookWarehouse={wh => handleOpenBookWarehouse(wh)}
                  onOpenAddWarehouse={() => handleOpenAddWarehouse()}
                />
              )}

              {activeTab === 'bookings' && (
                <MyBookingsPage
                  onOpenBookWarehouse={() => handleOpenBookWarehouse()}
                />
              )}

              {activeTab === 'movements' && (
                <StockMovementsPage
                  onOpenStockMovementModal={() => handleOpenStockMovement()}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationsPage />
              )}
            </>
          )}

          {/* WAREHOUSE MANAGER VIEWS */}
          {currentUser.role === 'Warehouse Manager' && (
            <>
              {activeTab === 'manager-operations' && (
                <WarehouseManagerView
                  onOpenStockMovementModal={item => handleOpenStockMovement(item)}
                />
              )}

              {activeTab === 'inventory' && (
                <MyInventoryPage
                  onOpenAddInventory={item => handleOpenAddInventory(item)}
                  onOpenBookWarehouse={() => handleOpenBookWarehouse()}
                />
              )}

              {activeTab === 'movements' && (
                <StockMovementsPage
                  onOpenStockMovementModal={() => handleOpenStockMovement()}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationsPage />
              )}
            </>
          )}

          {/* ADMIN-ONLY VIEWS */}
          {currentUser.role === 'Admin' && (
            <>
              {activeTab.startsWith('admin-') && (
                <AdminDashboard
                  activeSection={activeTab}
                  onOpenAddWarehouse={wh => handleOpenAddWarehouse(wh)}
                  onOpenAddUser={u => handleOpenAddUser(u)}
                  onOpenAddInventory={i => handleOpenAddInventory(i)}
                />
              )}

              {activeTab === 'movements' && (
                <StockMovementsPage
                  onOpenStockMovementModal={() => handleOpenStockMovement()}
                />
              )}

              {activeTab === 'notifications' && (
                <NotificationsPage />
              )}
            </>
          )}
        </main>
      </div>

      {/* MODALS */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
      />

      <AddInventoryModal
        isOpen={addInventoryOpen}
        onClose={() => {
          setAddInventoryOpen(false);
          setEditingInventory(null);
        }}
        onSuccess={() => {
          // trigger refresh on active tab
          setActiveTab(prev => (prev === 'dashboard' ? 'inventory' : prev));
        }}
        editItem={editingInventory}
      />

      <BookWarehouseModal
        isOpen={bookWarehouseOpen}
        onClose={() => {
          setBookWarehouseOpen(false);
          setSelectedWarehouseForBooking(null);
        }}
        onSuccess={() => {
          setActiveTab('bookings');
        }}
        preSelectedWarehouse={selectedWarehouseForBooking}
      />

      <AddWarehouseModal
        isOpen={addWarehouseOpen}
        onClose={() => {
          setAddWarehouseOpen(false);
          setEditingWarehouse(null);
        }}
        onSuccess={() => {
          setActiveTab('warehouses');
        }}
        editWarehouse={editingWarehouse}
      />

      <AddUserModal
        isOpen={addUserOpen}
        onClose={() => {
          setAddUserOpen(false);
          setEditingUser(null);
        }}
        onSuccess={() => {
          setActiveTab('admin-users');
        }}
        editUser={editingUser}
      />

      <StockMovementModal
        isOpen={stockMovementOpen}
        onClose={() => {
          setStockMovementOpen(false);
          setPreSelectedMovementItem(null);
        }}
        onSuccess={() => {
          setActiveTab('movements');
        }}
        preSelectedItem={preSelectedMovementItem}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
