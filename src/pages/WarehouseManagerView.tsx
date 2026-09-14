import React, { useState, useEffect } from 'react';
import { Warehouse, InventoryItem, WarehouseBooking, StockMovement } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { updateBookingInFirestore, updateInventoryItemInFirestore } from '../services/firestoreService';
import {
  Building2,
  Boxes,
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  PackageCheck,
  Search,
  Plus,
  RefreshCw,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { BarcodeBadge } from '../components/BarcodeBadge';

interface WarehouseManagerViewProps {
  onOpenStockMovementModal: (item?: InventoryItem) => void;
}

export const WarehouseManagerView: React.FC<WarehouseManagerViewProps> = ({
  onOpenStockMovementModal
}) => {
  const { currentUser } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bookings, setBookings] = useState<WarehouseBooking[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Status edit state
  const [statusUpdateItem, setStatusUpdateItem] = useState<InventoryItem | null>(null);
  const [newStatus, setNewStatus] = useState<string>('In Stock');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Rejection modal state
  const [rejectingBooking, setRejectingBooking] = useState<WarehouseBooking | null>(null);
  const [rejectReason, setRejectReason] = useState('Storage requirements incompatible with bay');

  const loadManagerData = async () => {
    try {
      setLoading(true);
      const allWh = await api.getWarehouses();
      setWarehouses(allWh);

      let targetWhId = selectedWarehouseId;
      if (!targetWhId) {
        // If current user is assigned to a warehouse, select that first
        if (currentUser?.assignedWarehouseId) {
          targetWhId = currentUser.assignedWarehouseId;
        } else if (allWh.length > 0) {
          targetWhId = allWh[0].id;
        }
        setSelectedWarehouseId(targetWhId);
      }

      if (targetWhId) {
        const [invData, bkgData, movData] = await Promise.all([
          api.getInventory({ warehouseId: targetWhId }),
          api.getBookings({ warehouseId: targetWhId }),
          api.getStockMovements({ warehouseId: targetWhId })
        ]);
        setInventory(invData);
        setBookings(bkgData);
        setMovements(movData);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManagerData();
  }, [currentUser, selectedWarehouseId]);

  const currentWh = warehouses.find(w => w.id === selectedWarehouseId);

  // Capacity calculations
  const totalCap = currentWh?.totalCapacity || 0;
  const availSpace = currentWh?.availableSpace || 0;
  const usedSpace = totalCap - availSpace;
  const usagePct = totalCap > 0 ? Math.round((usedSpace / totalCap) * 100) : 0;
  const isAlmostFull = usagePct >= 80;

  // Handle Receiving approval of pending booking
  const handleApproveReceiving = async (bookingId: string) => {
    try {
      setBookings(prev =>
        prev.map(b => (b.id === bookingId ? { ...b, status: 'Approved' as const } : b))
      );
      await api.updateBookingStatus(bookingId, 'Approved');
      updateBookingInFirestore(bookingId, { status: 'Approved' }).catch(fsErr => {
        console.warn('Firestore booking update notice:', fsErr);
      });
      loadManagerData();
    } catch (err: any) {
      console.error('Approval failed:', err);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingBooking) return;
    const bookingId = rejectingBooking.id;
    const finalReason = rejectReason.trim() || 'Rejected by Facility Manager';

    // Immediately close modal
    setRejectingBooking(null);

    // Optimistic UI update
    setBookings(prev =>
      prev.map(b => (b.id === bookingId ? { ...b, status: 'Rejected' as const, rejectionReason: finalReason } : b))
    );

    try {
      await api.updateBookingStatus(bookingId, 'Rejected', finalReason);
      updateBookingInFirestore(bookingId, {
        status: 'Rejected',
        rejectionReason: finalReason
      }).catch(fsErr => {
        console.warn('Firestore booking rejection notice:', fsErr);
      });
      loadManagerData();
    } catch (err: any) {
      console.error('Rejection failed:', err);
    }
  };

  const handleUpdateItemStatus = async () => {
    if (!statusUpdateItem) return;
    try {
      setUpdatingStatus(true);
      await api.updateInventory(statusUpdateItem.id, { status: newStatus as any });
      try {
        await updateInventoryItemInFirestore(statusUpdateItem.id, { status: newStatus as any });
      } catch (fsErr) {
        console.warn('Firestore status sync notice:', fsErr);
      }
      setInventory(prev =>
        prev.map(i => (i.id === statusUpdateItem.id ? { ...i, status: newStatus as any } : i))
      );
      setStatusUpdateItem(null);
    } catch (err: any) {
      console.error('Status update failed:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Facility Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Facility Operations View
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Warehouse Manager Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your assigned facility, approve item receiving, inspect stock, and record movement.
          </p>
        </div>

        {/* Warehouse Selector */}
        {warehouses.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Active Facility:</span>
            <select
              value={selectedWarehouseId}
              onChange={e => setSelectedWarehouseId(e.target.value)}
              className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.location})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {warehouses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Warehouses Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            No storage facilities exist in the database. An Administrator must first create a warehouse facility.
          </p>
        </div>
      ) : (
        <>
          {/* Warehouse Capacity Overview Card */}
          {currentWh && (
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{currentWh.name}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                      {currentWh.storageType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{currentWh.location}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenStockMovementModal()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Record Stock Movement (In/Out)
                  </button>
                </div>
              </div>

              {/* Capacity Progress Bar & Metrics */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Facility Capacity Utilization</span>
                  <span className="font-bold text-slate-900 font-mono">{usagePct}% Occupied</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usagePct >= 85 ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, usagePct)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Space</span>
                    <span className="font-mono font-bold text-slate-800">{totalCap.toLocaleString()} sq ft</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Occupied Space</span>
                    <span className="font-mono font-bold text-slate-800">{usedSpace.toLocaleString()} sq ft</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Available Space</span>
                    <span className="font-mono font-bold text-emerald-600">{availSpace.toLocaleString()} sq ft</span>
                  </div>
                </div>

                {isAlmostFull && (
                  <div className="p-2.5 bg-amber-100/70 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><strong>Facility Warning:</strong> This warehouse is almost full ({usagePct}% capacity). Consider dispatching completed bookings or notifying users.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pending Inbound Bookings / Item Receiving Section */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Inbound Bookings &amp; Item Receiving</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800">
                  {bookings.filter(b => b.status === 'Pending').length} Pending Receiving
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {bookings.filter(b => b.status === 'Pending').length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No pending item receiving requests for this facility.
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings
                    .filter(b => b.status === 'Pending')
                    .map(b => (
                      <div
                        key={b.id}
                        className="p-4 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-300 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900">#{b.id}</span>
                            <span className="text-xs font-semibold text-slate-700">• Client: {b.userName}</span>
                            <span className="text-[11px] text-slate-400">({b.userEmail})</span>
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            Requested Space: <strong>{b.requiredSpace} sq ft</strong> • Duration:{' '}
                            {new Date(b.startDate).toLocaleDateString()} to{' '}
                            {new Date(b.endDate).toLocaleDateString()}
                          </div>
                          {b.items && b.items.length > 0 && (
                            <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <strong>Items to receive:</strong>{' '}
                              {b.items.map(i => `${i.itemName} (${i.quantity} units)`).join(', ')}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setRejectingBooking(b);
                              setRejectReason('Storage requirements incompatible with bay');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveReceiving(b.id)}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve &amp; Check-In
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Stored Warehouse Inventory */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Stored Facility Inventory</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700">
                  {inventory.length} items
                </span>
              </div>
            </div>

            {inventory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No items currently assigned to this warehouse facility.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Item Details</th>
                      <th className="py-3.5 px-4">Client Owner</th>
                      <th className="py-3.5 px-4">Current Stock</th>
                      <th className="py-3.5 px-4">Storage Status</th>
                      <th className="py-3.5 px-4">Barcode / SKU</th>
                      <th className="py-3.5 px-4 text-right">Manager Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {inventory.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {item.category} • {item.storageRequirement}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{item.userName}</div>
                          <div className="text-[10px] text-slate-400">{item.userEmail}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold font-mono text-slate-900 text-sm">
                            {item.quantity} {item.unit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                        <td className="py-3.5 px-4">
                          <BarcodeBadge value={item.barcode || item.sku} className="scale-75 origin-left" />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setStatusUpdateItem(item);
                                setNewStatus(item.status);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200"
                            >
                              Update Status
                            </button>
                            <button
                              onClick={() => onOpenStockMovementModal(item)}
                              className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                            >
                              Move (In/Out)
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
        </>
      )}

      {/* Modal for updating item storage status */}
      {statusUpdateItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Update Storage Status</h3>
            <p className="text-xs text-slate-500 mt-1">
              Change physical storage handling status for <strong>{statusUpdateItem.name}</strong>
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Pending Inspection">Pending Inspection</option>
                <option value="In Stock">In Stock / Stored in Bay</option>
                <option value="Quarantined">Quarantined / Damaged</option>
                <option value="Shipped">Shipped / Dispatched</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setStatusUpdateItem(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateItemStatus}
                disabled={updatingStatus}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                {updatingStatus ? 'Updating...' : 'Save Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">Reject Receiving Request</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Reject intake for booking #{rejectingBooking.id} ({rejectingBooking.userName})
            </p>
            <div className="my-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reason for Rejection
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Specify reason..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingBooking(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
