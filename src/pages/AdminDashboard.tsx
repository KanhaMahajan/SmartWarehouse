import React, { useState, useEffect } from 'react';
import {
  User,
  Warehouse,
  InventoryItem,
  WarehouseBooking,
  SmartStats
} from '../types';
import { api } from '../services/api';
import {
  updateBookingInFirestore,
  saveUserToFirestore,
  deleteWarehouseFromFirestore,
  deleteUserFromFirestore,
  getFirestoreDatabaseStats,
  syncAllDataToFirestore,
  FirestoreDatabaseStats
} from '../services/firestoreService';
import {
  Building2,
  Users,
  Package,
  CalendarCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Boxes,
  ShieldCheck,
  Filter,
  Database,
  RefreshCw,
  Server,
  Cloud,
  Check,
  Loader2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { BarcodeBadge } from '../components/BarcodeBadge';

interface AdminDashboardProps {
  activeSection: string; // 'admin-dashboard' | 'admin-warehouses' | 'admin-bookings' | 'admin-inventory' | 'admin-users' | 'admin-reports'
  onOpenAddWarehouse: (wh?: Warehouse) => void;
  onOpenAddUser: (user?: User) => void;
  onOpenAddInventory: (item?: InventoryItem) => void;
}

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#10b981', '#f59e0b', '#ef4444'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  activeSection,
  onOpenAddWarehouse,
  onOpenAddUser,
  onOpenAddInventory
}) => {
  const [stats, setStats] = useState<SmartStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bookings, setBookings] = useState<WarehouseBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and filter states
  const [userSearch, setUserSearch] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCatFilter, setInventoryCatFilter] = useState('All');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('All');

  // Deletion and Approval Modals State
  const [deleteCandidateUser, setDeleteCandidateUser] = useState<User | null>(null);
  const [deleteCandidateWarehouse, setDeleteCandidateWarehouse] = useState<Warehouse | null>(null);
  const [cancelCandidateBooking, setCancelCandidateBooking] = useState<WarehouseBooking | null>(null);
  const [rejectCandidateBooking, setRejectCandidateBooking] = useState<WarehouseBooking | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('Warehouse capacity constraints');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Firestore Database Sync & Status
  const [firestoreStats, setFirestoreStats] = useState<FirestoreDatabaseStats | null>(null);
  const [syncingFirestore, setSyncingFirestore] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refreshFirestoreStats = async () => {
    try {
      const stats = await getFirestoreDatabaseStats();
      setFirestoreStats(stats);
      return stats;
    } catch (err) {
      console.warn('Failed loading Firestore stats:', err);
      return null;
    }
  };

  const handleSyncToFirestore = async (overrideData?: {
    warehouses?: Warehouse[];
    inventory?: InventoryItem[];
    bookings?: WarehouseBooking[];
    users?: User[];
  }) => {
    try {
      setSyncingFirestore(true);
      setSyncMessage(null);
      const whs = overrideData?.warehouses || warehouses;
      const invs = overrideData?.inventory || inventory;
      const bkgs = overrideData?.bookings || bookings;
      const usrs = overrideData?.users || users;

      const result = await syncAllDataToFirestore({
        warehouses: whs,
        inventory: invs,
        bookings: bkgs,
        users: usrs
      });

      await refreshFirestoreStats();
      setSyncMessage(`Synced ${result.totalSynced} items directly to Firebase Firestore! (${result.warehouses} warehouses, ${result.inventory} inventory, ${result.bookings} bookings, ${result.users} users)`);
      setTimeout(() => setSyncMessage(null), 6000);
    } catch (err: any) {
      setSyncMessage(`Sync notice: ${err.message || 'Error syncing data'}`);
    } finally {
      setSyncingFirestore(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [uData, whData, invData, bkgData, statsData] = await Promise.all([
        api.getUsers(),
        api.getWarehouses(),
        api.getInventory(),
        api.getBookings(),
        api.getStats()
      ]);
      setUsers(uData);
      setWarehouses(whData);
      setInventory(invData);
      setBookings(bkgData);
      setStats(statsData);

      const fStats = await refreshFirestoreStats();
      // If Firestore is empty (first time connection), automatically seed to Firestore
      if (fStats && fStats.warehousesCount === 0 && whData.length > 0) {
        console.log('[Firestore Auto-Seed] Populating initial Firestore collections...');
        syncAllDataToFirestore({
          warehouses: whData,
          inventory: invData,
          bookings: bkgData,
          users: uData
        }).then(() => refreshFirestoreStats());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSection]);

  // Booking actions
  const handleApproveBooking = async (id: string) => {
    try {
      setActionLoadingId(id);
      setBookings(prev =>
        prev.map(b => (b.id === id ? { ...b, status: 'Approved' as const } : b))
      );
      await api.updateBookingStatus(id, 'Approved');
      updateBookingInFirestore(id, { status: 'Approved' }).catch(err => {
        console.warn('Firestore booking status update notice:', err);
      });
      await loadData();
      refreshFirestoreStats().catch(() => {});
    } catch (err: any) {
      console.error('Approval failed', err);
      await loadData();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmRejectBooking = async () => {
    if (!rejectCandidateBooking) return;
    const targetBooking = rejectCandidateBooking;
    const id = targetBooking.id;
    const reason = rejectionReasonInput.trim() || 'Rejected by Administrator';

    // Immediately close modal
    setRejectCandidateBooking(null);
    setActionLoadingId(id);

    // Optimistic UI update
    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, status: 'Rejected' as const, rejectionReason: reason } : b))
    );

    try {
      await api.updateBookingStatus(id, 'Rejected', reason);
      updateBookingInFirestore(id, {
        status: 'Rejected',
        rejectionReason: reason
      }).catch(err => {
        console.warn('Firestore booking status update notice:', err);
      });
      await loadData();
      refreshFirestoreStats().catch(() => {});
    } catch (err: any) {
      console.error('Rejection failed', err);
      await loadData();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmCancelBooking = async () => {
    if (!cancelCandidateBooking) return;
    const targetBooking = cancelCandidateBooking;
    const id = targetBooking.id;

    // Immediately close modal so user is never stuck on "Cancelling..."
    setCancelCandidateBooking(null);
    setActionLoadingId(id);

    // Optimistic UI updates for bookings and warehouse capacity
    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, status: 'Cancelled' as const } : b))
    );
    setWarehouses(prev =>
      prev.map(w => {
        if (w.id === targetBooking.warehouseId) {
          const restoredSpace = Math.min(w.totalCapacity, w.availableSpace + targetBooking.requiredSpace);
          return {
            ...w,
            availableSpace: restoredSpace,
            status: restoredSpace >= w.totalCapacity ? 'Available' : w.status
          };
        }
        return w;
      })
    );

    try {
      await api.updateBookingStatus(id, 'Cancelled');
      updateBookingInFirestore(id, { status: 'Cancelled' }).catch(err => {
        console.warn('Firestore booking cancel notice:', err);
      });
      await loadData();
      refreshFirestoreStats().catch(() => {});
    } catch (err: any) {
      console.error('Cancellation failed', err);
      await loadData();
    } finally {
      setActionLoadingId(null);
    }
  };

  // Warehouse delete
  const handleDeleteWarehouse = async () => {
    if (!deleteCandidateWarehouse) return;
    try {
      await api.deleteWarehouse(deleteCandidateWarehouse.id);
      try {
        await deleteWarehouseFromFirestore(deleteCandidateWarehouse.id);
      } catch (fsErr) {
        console.warn('Firestore delete warehouse notice:', fsErr);
      }
      setWarehouses(prev => prev.filter(w => w.id !== deleteCandidateWarehouse.id));
      setDeleteCandidateWarehouse(null);
      loadData();
      refreshFirestoreStats();
    } catch (err: any) {
      console.error('Delete failed', err);
    }
  };

  // User delete
  const handleDeleteUser = async () => {
    if (!deleteCandidateUser) return;
    try {
      await api.deleteUser(deleteCandidateUser.id);
      try {
        await deleteUserFromFirestore(deleteCandidateUser.id);
      } catch (fsErr) {
        console.warn('Firestore delete user notice:', fsErr);
      }
      setUsers(prev => prev.filter(u => u.id !== deleteCandidateUser.id));
      setDeleteCandidateUser(null);
      loadData();
      refreshFirestoreStats();
    } catch (err: any) {
      console.error('Delete failed', err);
    }
  };

  // Toggle user status
  const handleToggleUserStatus = async (user: User) => {
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.updateUser(user.id, { status: nextStatus });
      try {
        await saveUserToFirestore({ ...user, status: nextStatus });
      } catch (fsErr) {
        console.warn('Firestore user status sync notice:', fsErr);
      }
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, status: nextStatus } : u)));
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  };

  // Prepare chart data
  const warehouseChartData = warehouses.map(w => ({
    name: w.name.length > 14 ? `${w.name.substring(0, 12)}...` : w.name,
    capacity: w.totalCapacity,
    available: w.availableSpace,
    occupied: Math.max(0, w.totalCapacity - w.availableSpace)
  }));

  const categoryCounts: { [cat: string]: number } = {};
  inventory.forEach(i => {
    const cat = i.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + i.quantity;
  });
  const categoryChartData = Object.keys(categoryCounts).map(cat => ({
    name: cat,
    value: categoryCounts[cat]
  }));

  // Render sub-views based on activeSection
  const isOverview = activeSection === 'admin-dashboard';
  const isWarehouses = activeSection === 'admin-warehouses';
  const isBookings = activeSection === 'admin-bookings';
  const isInventory = activeSection === 'admin-inventory';
  const isUsers = activeSection === 'admin-users';
  const isReports = activeSection === 'admin-reports';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Admin Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            System Administrator Control Plane
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {isOverview && 'Administrator Dashboard & Overview'}
            {isWarehouses && 'Warehouse Facility Management'}
            {isBookings && 'Warehouse Booking Approvals & Management'}
            {isInventory && 'Master Inventory Oversight'}
            {isUsers && 'User Directory & Role Management'}
            {isReports && 'Reports, Capacity & Stock Analytics'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Full administrative control over users, storage facilities, inventory status, and reservations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isWarehouses && (
            <button
              onClick={() => onOpenAddWarehouse()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              + Add Warehouse
            </button>
          )}
          {isUsers && (
            <button
              onClick={() => onOpenAddUser()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              + Add User
            </button>
          )}
          {isInventory && (
            <button
              onClick={() => onOpenAddInventory()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              + Add Item
            </button>
          )}
        </div>
      </div>

      {/* Firebase Cloud Firestore Database & Storage Center */}
      <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 border border-blue-200/80 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">Firebase Firestore Cloud Database</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live & Connected
                </span>
                <span className="text-xs text-slate-500 font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  Project: smart-inventory-and-warehouse
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Real-time Firestore database sync. Your warehouse bookings, facilities, inventory records, and user accounts are persisted to Firebase.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => refreshFirestoreStats()}
              className="px-3 py-2 text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
              title="Refresh Firestore counts"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </button>
            <button
              onClick={() => handleSyncToFirestore()}
              disabled={syncingFirestore}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              {syncingFirestore ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing to Firebase...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Sync All Data to Firebase</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Firestore Document Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-blue-100">
          <div className="bg-white/90 border border-slate-200/80 rounded-xl px-3 py-2">
            <div className="text-[11px] text-slate-500 font-medium">Warehouses in Firestore</div>
            <div className="text-lg font-bold font-mono text-slate-900 flex items-center justify-between">
              <span>{firestoreStats ? firestoreStats.warehousesCount : warehouses.length}</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-sans font-medium">Stored</span>
            </div>
          </div>
          <div className="bg-white/90 border border-slate-200/80 rounded-xl px-3 py-2">
            <div className="text-[11px] text-slate-500 font-medium">Inventory Items in Firestore</div>
            <div className="text-lg font-bold font-mono text-slate-900 flex items-center justify-between">
              <span>{firestoreStats ? firestoreStats.inventoryCount : inventory.length}</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-sans font-medium">Stored</span>
            </div>
          </div>
          <div className="bg-white/90 border border-slate-200/80 rounded-xl px-3 py-2">
            <div className="text-[11px] text-slate-500 font-medium">Bookings in Firestore</div>
            <div className="text-lg font-bold font-mono text-slate-900 flex items-center justify-between">
              <span>{firestoreStats ? firestoreStats.bookingsCount : bookings.length}</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-sans font-medium">Stored</span>
            </div>
          </div>
          <div className="bg-white/90 border border-slate-200/80 rounded-xl px-3 py-2">
            <div className="text-[11px] text-slate-500 font-medium">Users in Firestore</div>
            <div className="text-lg font-bold font-mono text-slate-900 flex items-center justify-between">
              <span>{firestoreStats ? firestoreStats.usersCount : users.length}</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-sans font-medium">Stored</span>
            </div>
          </div>
        </div>

        {syncMessage && (
          <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}
      </div>

      {/* OVERVIEW / DASHBOARD VIEW */}
      {(isOverview || isReports) && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Registered Users</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">{users.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {users.filter(u => u.role === 'Admin').length} Admin •{' '}
                {users.filter(u => u.role === 'Warehouse Manager').length} Manager •{' '}
                {users.filter(u => u.role === 'User').length} Client
              </div>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Warehouses</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">{warehouses.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {warehouses.reduce((acc, w) => acc + w.totalCapacity, 0).toLocaleString()} sq ft capacity
              </div>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Master Inventory</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">{inventory.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {inventory.reduce((acc, i) => acc + i.quantity, 0).toLocaleString()} total stock units
              </div>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Storage Bookings</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">{bookings.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                <span className="text-amber-600 font-bold">
                  {bookings.filter(b => b.status === 'Pending').length} Pending
                </span>{' '}
                • {bookings.filter(b => b.status === 'Approved' || b.status === 'Active').length} Active
              </div>
            </div>
          </div>

          {/* Recharts Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Warehouse Capacity Chart */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Warehouse Space Allocation</h3>
                  <p className="text-xs text-slate-500">Available vs Occupied Space (sq ft)</p>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  {stats?.warehouseUtilizationRate || 0}% avg utilized
                </span>
              </div>

              {warehouseChartData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Building2 className="w-8 h-8 mb-2 opacity-40" />
                  <p>No warehouses created yet.</p>
                  <p className="text-[10px] mt-0.5">Create warehouses to visualize capacity allocation.</p>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={warehouseChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="occupied" name="Occupied Space" fill="#2563eb" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="available" name="Available Space" fill="#93c5fd" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Inventory Category Breakdown */}
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Inventory by Category</h3>
                  <p className="text-xs text-slate-500">Stock distribution across product categories</p>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  {categoryChartData.length} categories
                </span>
              </div>

              {categoryChartData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Package className="w-8 h-8 mb-2 opacity-40" />
                  <p>No inventory registered yet.</p>
                  <p className="text-[10px] mt-0.5">Items added by users will automatically plot here.</p>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }: { name: string; percent: number }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {categoryChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* WAREHOUSE MANAGEMENT SECTION */}
      {isWarehouses && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search facilities by name or location..."
                value={warehouseSearch}
                onChange={e => setWarehouseSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {warehouses.length === 0 ? (
              <div className="py-16 text-center px-4">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-900">0 Warehouses Configured</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Create your first warehouse facility to make storage space available for users to book.
                </p>
                <button
                  onClick={() => onOpenAddWarehouse()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                >
                  + Add Warehouse Facility
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Facility Name &amp; Location</th>
                      <th className="py-3.5 px-4">Storage Type</th>
                      <th className="py-3.5 px-4">Total Capacity</th>
                      <th className="py-3.5 px-4">Available Space</th>
                      <th className="py-3.5 px-4">Rate / Month</th>
                      <th className="py-3.5 px-4">Facility Manager</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {warehouses
                      .filter(
                        w =>
                          w.name.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
                          w.location.toLowerCase().includes(warehouseSearch.toLowerCase())
                      )
                      .map(w => (
                        <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{w.name}</div>
                            <div className="text-[11px] text-slate-500">{w.location}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                              {w.storageType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {w.totalCapacity.toLocaleString()} sq ft
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                            {w.availableSpace.toLocaleString()} sq ft
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            ${w.pricePerMonth} <span className="text-[10px] font-normal text-slate-400">/ sq ft</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {w.assignedManagerName || <span className="text-slate-400 italic">Unassigned</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                w.status === 'Available'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : w.status === 'Almost Full'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {w.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onOpenAddWarehouse(w)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                title="Edit warehouse"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteCandidateWarehouse(w)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete warehouse"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOOKING APPROVALS SECTION */}
      {isBookings && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={bookingStatusFilter}
                onChange={e => setBookingStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-700"
              >
                <option value="All">All Statuses ({bookings.length})</option>
                <option value="Pending">Pending ({bookings.filter(b => b.status === 'Pending').length})</option>
                <option value="Approved">Approved ({bookings.filter(b => b.status === 'Approved').length})</option>
                <option value="Active">Active ({bookings.filter(b => b.status === 'Active').length})</option>
                <option value="Completed">Completed ({bookings.filter(b => b.status === 'Completed').length})</option>
                <option value="Cancelled">Cancelled ({bookings.filter(b => b.status === 'Cancelled').length})</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {bookings.length === 0 ? (
              <div className="py-16 text-center px-4">
                <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-900">0 Warehouse Bookings</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  When users select warehouses and book storage space, their booking requests will appear here for approval.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Booking ID</th>
                      <th className="py-3.5 px-4">User / Requester</th>
                      <th className="py-3.5 px-4">Warehouse</th>
                      <th className="py-3.5 px-4">Requested Space</th>
                      <th className="py-3.5 px-4">Items to Store</th>
                      <th className="py-3.5 px-4">Booking Period</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {bookings
                      .filter(b => bookingStatusFilter === 'All' || b.status === bookingStatusFilter)
                      .map(b => (
                        <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            #{b.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{b.userName}</div>
                            <div className="text-[10px] text-slate-400">{b.userEmail}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800">{b.warehouseName}</div>
                            <div className="text-[10px] text-slate-400">{b.warehouseLocation}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {b.requiredSpace.toLocaleString()} sq ft
                          </td>
                          <td className="py-3.5 px-4">
                            {b.items && b.items.length > 0 ? (
                              <div className="text-[11px] text-slate-700">
                                {b.items.map(i => `${i.itemName} (${i.quantity})`).join(', ')}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Space reservation</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-slate-600">
                            {new Date(b.startDate).toLocaleDateString()} &rarr;{' '}
                            {new Date(b.endDate).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                b.status === 'Pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : b.status === 'Approved'
                                  ? 'bg-blue-100 text-blue-800'
                                  : b.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : b.status === 'Completed'
                                  ? 'bg-slate-100 text-slate-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {b.status}
                            </span>
                            {b.rejectionReason && (
                              <div className="text-[10px] text-rose-600 mt-0.5">{b.rejectionReason}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {b.status === 'Pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setCancelCandidateBooking(b)}
                                  disabled={actionLoadingId === b.id}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                  title="Cancel this booking"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectCandidateBooking(b);
                                    setRejectionReasonInput('Warehouse capacity constraints');
                                  }}
                                  disabled={actionLoadingId === b.id}
                                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleApproveBooking(b.id)}
                                  disabled={actionLoadingId === b.id}
                                  className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                                >
                                  {actionLoadingId === b.id ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Approving...</span>
                                    </>
                                  ) : (
                                    'Approve'
                                  )}
                                </button>
                              </div>
                            ) : (b.status === 'Approved' || b.status === 'Active') ? (
                              <button
                                onClick={() => setCancelCandidateBooking(b)}
                                disabled={actionLoadingId === b.id}
                                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 ml-auto"
                              >
                                {actionLoadingId === b.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Cancelling...</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Cancel Booking</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px] font-medium italic">{b.status}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MASTER INVENTORY OVERSIGHT */}
      {isInventory && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search all items, SKUs, or owners..."
                value={inventorySearch}
                onChange={e => setInventorySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={inventoryCatFilter}
                onChange={e => setInventoryCatFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700"
              >
                <option value="All">All Categories</option>
                {Array.from(new Set(inventory.map(i => i.category).filter(Boolean))).map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {inventory.length === 0 ? (
              <div className="py-16 text-center px-4">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-900">0 Inventory Items In System</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  No items registered by users yet. Items registered through user forms will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Item &amp; SKU</th>
                      <th className="py-3.5 px-4">Owner / User</th>
                      <th className="py-3.5 px-4">Stored Warehouse</th>
                      <th className="py-3.5 px-4">Quantity</th>
                      <th className="py-3.5 px-4">Category &amp; Storage Type</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {inventory
                      .filter(
                        i =>
                          (inventoryCatFilter === 'All' || i.category === inventoryCatFilter) &&
                          (inventorySearch === '' ||
                            i.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                            i.sku.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                            i.userName.toLowerCase().includes(inventorySearch.toLowerCase()))
                      )
                      .map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{item.userName}</div>
                            <div className="text-[10px] text-slate-400">{item.userEmail}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            {item.warehouseName ? (
                              <span className="font-medium text-slate-800">{item.warehouseName}</span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned Bay</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <div>{item.category}</div>
                            <div className="text-[10px] text-slate-400">{item.storageRequirement}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === 'In Stock'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'Low Stock'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onOpenAddInventory(item)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                title="Edit item"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* USER MANAGEMENT SECTION */}
      {isUsers && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search registered users by name, email, or role..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {users.length === 0 ? (
              <div className="py-16 text-center px-4">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-900">0 Registered Users</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  No users exist in the database yet. Users can register through the registration form or you can add users manually.
                </p>
                <button
                  onClick={() => onOpenAddUser()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                >
                  + Add First User
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">User Details</th>
                      <th className="py-3.5 px-4">Phone Number</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Account Status</th>
                      <th className="py-3.5 px-4">Created Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {users
                      .filter(
                        u =>
                          u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.role.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[11px] text-slate-500">{u.email}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {u.phone || <span className="text-slate-400 italic">None</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                u.role === 'Admin'
                                  ? 'bg-blue-100 text-blue-800'
                                  : u.role === 'Warehouse Manager'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                                u.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                              }`}
                              title="Click to toggle status"
                            >
                              {u.status}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onOpenAddUser(u)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                title="Edit user"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteCandidateUser(u)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete user"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warehouse Deletion Modal */}
      {deleteCandidateWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Warehouse?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete <strong>"{deleteCandidateWarehouse.name}"</strong>? Stored items will be unassigned.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteCandidateWarehouse(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWarehouse}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Deletion Modal */}
      {deleteCandidateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete User Account?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Delete account for <strong>{deleteCandidateUser.name}</strong> ({deleteCandidateUser.email})?
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteCandidateUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Confirmation Modal */}
      {cancelCandidateBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">Cancel Warehouse Booking</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Are you sure you want to cancel this booking? This will update the status and immediately restore the reserved space in the warehouse facility.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 my-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Booking ID:</span>
                <span className="font-mono font-bold text-slate-900">#{cancelCandidateBooking.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Client:</span>
                <span className="font-semibold text-slate-900">{cancelCandidateBooking.userName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Facility:</span>
                <span className="font-semibold text-slate-900">{cancelCandidateBooking.warehouseName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Capacity to Restore:</span>
                <span className="font-mono font-bold text-emerald-600">+{cancelCandidateBooking.requiredSpace} sq ft</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Current Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {cancelCandidateBooking.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelCandidateBooking(null)}
                disabled={actionLoadingId === cancelCandidateBooking.id}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelBooking}
                disabled={actionLoadingId === cancelCandidateBooking.id}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                {actionLoadingId === cancelCandidateBooking.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Confirm Cancel Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Booking Modal */}
      {rejectCandidateBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">Reject Booking Request</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Select or specify a reason for rejecting booking #{rejectCandidateBooking.id}.
            </p>

            <div className="my-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Rejection Reason
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  'Warehouse capacity constraints',
                  'Storage type incompatibility',
                  'Incomplete cargo documentation',
                  'Requested schedule unavailable'
                ].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRejectionReasonInput(r)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors ${
                      rejectionReasonInput === r
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={rejectionReasonInput}
                onChange={e => setRejectionReasonInput(e.target.value)}
                placeholder="Enter custom rejection reason..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectCandidateBooking(null)}
                disabled={actionLoadingId === rejectCandidateBooking.id}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectBooking}
                disabled={actionLoadingId === rejectCandidateBooking.id}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                {actionLoadingId === rejectCandidateBooking.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
