import React, { useState, useEffect } from 'react';
import { WarehouseBooking } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  getBookingsFromFirestore,
  subscribeUserBookings,
  updateBookingInFirestore
} from '../services/firestoreService';
import {
  CalendarCheck,
  Building2,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Flame
} from 'lucide-react';

interface MyBookingsPageProps {
  onOpenBookWarehouse: () => void;
}

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({ onOpenBookWarehouse }) => {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState<WarehouseBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isFirestoreSynced, setIsFirestoreSynced] = useState(false);
  const [cancelModalBooking, setCancelModalBooking] = useState<WarehouseBooking | null>(null);

  const loadBookings = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      // Try Firestore first
      try {
        const firestoreList = await getBookingsFromFirestore({ userId: currentUser.id });
        if (firestoreList && firestoreList.length > 0) {
          setBookings(firestoreList);
          setIsFirestoreSynced(true);
          setLoading(false);
          return;
        }
      } catch (fsErr) {
        console.warn('Firestore fetch fallback to API:', fsErr);
      }

      // API fallback / initial seed
      const data = await api.getBookings({ userId: currentUser.id });
      setBookings(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();

    // Setup real-time listener for Firestore bookings
    if (currentUser?.id) {
      const unsubscribe = subscribeUserBookings(
        currentUser.id,
        (liveBookings) => {
          if (liveBookings && liveBookings.length > 0) {
            setBookings(liveBookings);
            setIsFirestoreSynced(true);
          }
        },
        (err) => {
          console.warn('Firestore subscription notice:', err);
        }
      );

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [currentUser]);

  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    const id = cancelModalBooking.id;

    // Immediately close modal
    setCancelModalBooking(null);
    setCancellingId(id);

    // Optimistic UI update
    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, status: 'Cancelled' as const } : b))
    );

    try {
      await api.updateBookingStatus(id, 'Cancelled');
      updateBookingInFirestore(id, { status: 'Cancelled' }).catch(fsErr => {
        console.warn('Firestore cancel booking notice:', fsErr);
      });
    } catch (err: any) {
      console.error('Failed to cancel booking:', err);
      loadBookings();
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <CalendarCheck className="w-6 h-6 text-blue-600" />
              My Warehouse Bookings
            </h1>
            {isFirestoreSynced && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                Firestore Live Synced
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track your storage reservations, approval statuses, and stored inventory allocations.
          </p>
        </div>

        <button
          onClick={onOpenBookWarehouse}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-blue-500/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          + New Storage Booking
        </button>
      </div>

      {/* Bookings Table / List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {bookings.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CalendarCheck className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Warehouse Bookings Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              You haven't submitted any warehouse space reservations. Register your products and reserve space in an available facility.
            </p>
            <button
              onClick={onOpenBookWarehouse}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              Book Warehouse Storage
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Booking ID</th>
                  <th className="py-3.5 px-4">Warehouse Facility</th>
                  <th className="py-3.5 px-4">Storage Space</th>
                  <th className="py-3.5 px-4">Items Stored</th>
                  <th className="py-3.5 px-4">Booking Date</th>
                  <th className="py-3.5 px-4">Period (Start — End)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {bookings.map(b => {
                  const isPending = b.status === 'Pending';
                  const isApproved = b.status === 'Approved';
                  const isActive = b.status === 'Active';
                  const isCompleted = b.status === 'Completed';
                  const isCancelled = b.status === 'Cancelled' || b.status === 'Rejected';

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Booking ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{b.id}
                      </td>

                      {/* Warehouse */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{b.warehouseName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{b.warehouseLocation}</div>
                      </td>

                      {/* Storage Space & Cost */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 font-mono">
                          {b.requiredSpace.toLocaleString()} sq ft
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          ${b.estimatedCost.toLocaleString()} est.
                        </div>
                      </td>

                      {/* Items Stored */}
                      <td className="py-3.5 px-4">
                        {b.items && b.items.length > 0 ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              {b.items.length} item{b.items.length > 1 ? 's' : ''}
                            </span>
                            <div className="text-[10px] text-slate-500 line-clamp-1 max-w-xs mt-0.5">
                              {b.items.map(i => `${i.itemName} (${i.quantity})`).join(', ')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Space reserved</span>
                        )}
                      </td>

                      {/* Booking Date */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>

                      {/* Period */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 font-medium">
                          {new Date(b.startDate).toLocaleDateString()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          to {new Date(b.endDate).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : isApproved
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isCompleted
                              ? 'bg-slate-100 text-slate-800 border border-slate-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isPending && <Clock className="w-3 h-3" />}
                          {isApproved && <CheckCircle2 className="w-3 h-3" />}
                          {isActive && <CheckCircle2 className="w-3 h-3" />}
                          {isCancelled && <XCircle className="w-3 h-3" />}
                          <span>{b.status}</span>
                        </span>
                        {b.rejectionReason && (
                          <p className="text-[10px] text-rose-600 mt-1 max-w-xs">{b.rejectionReason}</p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {(isPending || isApproved) && (
                          <button
                            onClick={() => setCancelModalBooking(b)}
                            disabled={cancellingId === b.id}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Cancel Booking #{cancelModalBooking.id}?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to cancel your reservation for <strong>{cancelModalBooking.warehouseName}</strong> ({cancelModalBooking.requiredSpace} sq ft)?
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                disabled={cancellingId === cancelModalBooking.id}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancellingId === cancelModalBooking.id}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                {cancellingId === cancelModalBooking.id ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
