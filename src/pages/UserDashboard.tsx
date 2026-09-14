import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getBookingsFromFirestore, subscribeUserBookings } from '../services/firestoreService';
import {
  InventoryItem,
  Warehouse,
  WarehouseBooking,
  StockMovement,
  NotificationItem
} from '../types';
import {
  Package,
  Plus,
  Building2,
  CalendarCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  Boxes,
  Bell
} from 'lucide-react';
import { BarcodeBadge } from '../components/BarcodeBadge';

interface UserDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenAddInventory: () => void;
  onOpenBookWarehouse: (wh?: Warehouse) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onNavigate,
  onOpenAddInventory,
  onOpenBookWarehouse
}) => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [bookings, setBookings] = useState<WarehouseBooking[]>([]);
  const [activities, setActivities] = useState<StockMovement[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [invData, whData, bkgData, movData, notifData] = await Promise.all([
        api.getInventory({ userId: currentUser.id }),
        api.getWarehouses(),
        api.getBookings({ userId: currentUser.id }),
        api.getStockMovements(),
        api.getNotifications({ userId: currentUser.id })
      ]);
      setItems(invData);
      setWarehouses(whData);

      // Prefer Firestore bookings if available
      try {
        const fsBookings = await getBookingsFromFirestore({ userId: currentUser.id });
        if (fsBookings && fsBookings.length > 0) {
          setBookings(fsBookings);
        } else {
          setBookings(bkgData);
        }
      } catch {
        setBookings(bkgData);
      }

      setActivities(movData.slice(0, 6));
      setNotifications(notifData.slice(0, 5));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (currentUser?.id) {
      const unsubscribe = subscribeUserBookings(
        currentUser.id,
        (liveBookings) => {
          if (liveBookings && liveBookings.length > 0) {
            setBookings(liveBookings);
          }
        },
        () => {}
      );
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [currentUser]);

  // Calculations for Stock Status
  const totalItemsCount = items.length;
  const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);
  const lowStockItems = items.filter(i => i.quantity > 0 && i.quantity <= i.lowStockThreshold);
  const outOfStockItems = items.filter(i => i.quantity === 0);
  const inStockItems = items.filter(i => i.quantity > i.lowStockThreshold);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Welcome with Quick Actions */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Client Inventory Portal
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {currentUser?.name || 'User'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track stock balance, view warehouse capacity, and manage your storage reservations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="dash-add-inv-btn"
            onClick={onOpenAddInventory}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-blue-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            + Add Inventory
          </button>
          <button
            id="dash-book-wh-btn"
            onClick={() => onOpenBookWarehouse()}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center gap-2"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            Book Warehouse
          </button>
        </div>
      </div>

      {/* Smart Alerts Bar (if low stock or out of stock exists) */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold">Smart Inventory Alert</h4>
            <p className="text-amber-800 mt-0.5">
              You have {outOfStockItems.length} out-of-stock item(s) and {lowStockItems.length} low-stock item(s) requiring attention.
            </p>
          </div>
          <button
            onClick={() => onNavigate('inventory')}
            className="text-xs font-bold text-amber-900 hover:underline shrink-0"
          >
            Review Inventory &rarr;
          </button>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* My Inventory */}
        <div
          onClick={() => onNavigate('inventory')}
          className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">My Inventory</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {totalItemsCount} <span className="text-xs font-normal text-slate-400">Products</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 font-mono">{totalUnits}</span> total units stored
          </div>
        </div>

        {/* Stock Status */}
        <div
          onClick={() => onNavigate('inventory')}
          className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Stock Status</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">
            {inStockItems.length} <span className="text-xs font-normal text-slate-400">Normal</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span className="text-amber-600 font-semibold">{lowStockItems.length} Low</span> •
            <span className="text-rose-600 font-semibold">{outOfStockItems.length} Out</span>
          </div>
        </div>

        {/* Available Warehouses */}
        <div
          onClick={() => onNavigate('warehouses')}
          className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">Available Warehouses</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {warehouses.length} <span className="text-xs font-normal text-slate-400">Facilities</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {warehouses.length > 0
              ? `${warehouses.reduce((acc, w) => acc + w.availableSpace, 0).toLocaleString()} sq ft total space`
              : 'No facilities configured'}
          </div>
        </div>

        {/* My Warehouse Bookings */}
        <div
          onClick={() => onNavigate('bookings')}
          className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500">My Warehouse Bookings</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {bookings.length} <span className="text-xs font-normal text-slate-400">Bookings</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            <span className="text-amber-600 font-semibold">
              {bookings.filter(b => b.status === 'Pending').length} Pending
            </span>{' '}
            • {bookings.filter(b => b.status === 'Approved' || b.status === 'Active').length} Active
          </div>
        </div>
      </div>

      {/* Grid: My Registered Items Preview & Available Warehouses Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section: My Registered Items */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">My Registered Items</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700">
                {items.length}
              </span>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 sm:p-5 flex-1">
            {items.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <Package className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">My Inventory: 0 Items</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
                  You haven't registered any items yet. Register your first item to begin tracking and booking storage.
                </p>
                <button
                  id="zero-state-add-inv-btn"
                  onClick={onOpenAddInventory}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  + Add Inventory
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.slice(0, 4).map(item => (
                  <div
                    key={item.id}
                    className="p-3 border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {item.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">{item.name}</h5>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono text-slate-600">{item.sku}</span>
                          <span>•</span>
                          <span>{item.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-slate-900">
                        {item.quantity} {item.unit}
                      </div>
                      <span
                        className={`inline-block text-[10px] px-2 py-0.5 rounded font-bold mt-0.5 ${
                          item.status === 'In Stock'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'Low Stock'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section: Available Warehouses Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Available Warehouses</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700">
                {warehouses.length}
              </span>
            </div>
            <button
              onClick={() => onNavigate('warehouses')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Browse All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 sm:p-5 flex-1">
            {warehouses.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Available Warehouses: No warehouses available</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Once an Administrator creates warehouses, you will be able to book storage space and assign your inventory here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {warehouses.slice(0, 3).map(wh => {
                  const used = wh.totalCapacity - wh.availableSpace;
                  const pct = wh.totalCapacity > 0 ? Math.round((used / wh.totalCapacity) * 100) : 0;
                  return (
                    <div
                      key={wh.id}
                      className="p-3.5 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">{wh.name}</h5>
                          <p className="text-[11px] text-slate-500 mt-0.5">{wh.location}</p>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          {wh.storageType}
                        </span>
                      </div>

                      <div className="mt-2.5">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Occupancy: {pct}%</span>
                          <span className="font-semibold text-slate-700">
                            {wh.availableSpace.toLocaleString()} sq ft available
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 85 ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          ${wh.pricePerMonth} <span className="text-[10px] font-normal text-slate-500">/ sq ft / mo</span>
                        </span>
                        <button
                          onClick={() => onOpenBookWarehouse(wh)}
                          className="px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                        >
                          Book Facility
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Activities & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Stock Activities</h3>
            </div>
            <button
              onClick={() => onNavigate('movements')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Full Log <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No stock movement activity recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activities.map(act => (
                  <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{act.itemName}</span>
                      <div className="text-[11px] text-slate-500">
                        {act.movementType}: {act.quantity} {act.unit} • {act.reason}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                          act.movementType === 'Stock In'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {act.movementType}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {new Date(act.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications & System Alerts */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
            </div>
            <button
              onClick={() => onNavigate('notifications')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              All Alerts <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 sm:p-5">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No new notifications.
              </div>
            ) : (
              <div className="space-y-2.5">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs"
                  >
                    <div className="mt-0.5 shrink-0">
                      {notif.type === 'alert' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                      {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      {notif.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {notif.type === 'info' && <Clock className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900">{notif.title}</h5>
                      <p className="text-[11px] text-slate-600 mt-0.5">{notif.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
