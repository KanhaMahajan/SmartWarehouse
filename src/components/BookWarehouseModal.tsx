import React, { useState, useEffect } from 'react';
import { Warehouse, InventoryItem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { saveBookingToFirestore } from '../services/firestoreService';
import {
  CalendarCheck,
  Building2,
  Package,
  AlertCircle,
  Check,
  DollarSign,
  Info
} from 'lucide-react';

interface BookWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedWarehouse?: Warehouse | null;
}

export const BookWarehouseModal: React.FC<BookWarehouseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preSelectedWarehouse
}) => {
  const { currentUser } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [userInventory, setUserInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [requiredSpace, setRequiredSpace] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<{ [itemId: string]: boolean }>({});

  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Fetch active warehouses created by Admin
      api.getWarehouses()
        .then(data => {
          setWarehouses(data);
          if (preSelectedWarehouse) {
            setSelectedWarehouseId(preSelectedWarehouse.id);
          } else if (data.length > 0 && !selectedWarehouseId) {
            setSelectedWarehouseId(data[0].id);
          }
        })
        .catch(() => {});

      // Fetch current user's registered inventory
      if (currentUser) {
        api.getInventory({ userId: currentUser.id })
          .then(items => {
            setUserInventory(items);
            // Default select items
            const initSelected: { [key: string]: boolean } = {};
            items.forEach(it => {
              initSelected[it.id] = true;
            });
            setSelectedItemIds(initSelected);
          })
          .catch(() => {});
      }

      // Default dates
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(today.getMonth() + 1);

      setStartDate(today.toISOString().split('T')[0]);
      setEndDate(nextMonth.toISOString().split('T')[0]);
      setRequiredSpace(50);
    }
  }, [isOpen, preSelectedWarehouse, currentUser]);

  if (!isOpen) return null;

  const currentWh = warehouses.find(w => w.id === selectedWarehouseId);

  // Calculate estimated cost
  let estimatedCost = 0;
  if (currentWh && requiredSpace && startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
    const months = Math.max(1, Math.ceil(days / 30));
    estimatedCost = currentWh.pricePerMonth * Number(requiredSpace) * months;
  }

  const handleToggleItem = (id: string) => {
    setSelectedItemIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser) {
      setError('Please sign in to book warehouse storage.');
      return;
    }

    if (!selectedWarehouseId) {
      setError('Please select a warehouse facility.');
      return;
    }

    if (!requiredSpace || Number(requiredSpace) <= 0) {
      setError('Please specify valid required storage space.');
      return;
    }

    if (currentWh && Number(requiredSpace) > currentWh.availableSpace) {
      setError(
        `Required space (${requiredSpace} sq ft) exceeds available space in ${currentWh.name} (${currentWh.availableSpace} sq ft).`
      );
      return;
    }

    if (!startDate || !endDate) {
      setError('Please specify start and end dates.');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('End date must be after start date.');
      return;
    }

    // Filter items to store
    const chosenItems = userInventory
      .filter(i => selectedItemIds[i.id])
      .map(i => ({
        itemId: i.id,
        itemName: i.name,
        sku: i.sku,
        quantity: i.quantity
      }));

    try {
      setLoading(true);
      const newBooking = await api.createBooking({
        userId: currentUser.id,
        warehouseId: selectedWarehouseId,
        requiredSpace: Number(requiredSpace),
        startDate,
        endDate,
        items: chosenItems
      });

      // Persist booking in user's Firestore bookings collection
      try {
        await saveBookingToFirestore(newBooking);
      } catch (fsErr) {
        console.warn('Firestore booking store notice:', fsErr);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Book Warehouse Storage</h2>
              <p className="text-xs text-slate-500">Reserve verified space for your inventory items</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/60"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Warehouse Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Warehouse Facility <span className="text-rose-500">*</span>
            </label>
            {warehouses.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">No warehouses available yet.</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    An Administrator must create and configure at least one warehouse before booking can be completed.
                  </p>
                </div>
              </div>
            ) : (
              <select
                id="booking-warehouse-select"
                value={selectedWarehouseId}
                onChange={e => setSelectedWarehouseId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} — {w.location} ({w.availableSpace} sq ft avail. / {w.storageType}) - ${w.pricePerMonth}/mo/sqft
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Warehouse Details card if selected */}
          {currentWh && (
            <div className="p-3.5 bg-blue-50/60 border border-blue-200/70 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900">{currentWh.name}</span>
                <span className="text-slate-500 ml-2">({currentWh.location})</span>
                <div className="text-[11px] text-blue-700 font-medium mt-0.5">
                  Type: {currentWh.storageType} • Rate: ${currentWh.pricePerMonth}/sq ft/month
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Available Space</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {currentWh.availableSpace} sq ft
                </span>
              </div>
            </div>
          )}

          {/* Space Requirement & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Required Space (sq ft) <span className="text-rose-500">*</span>
              </label>
              <input
                id="booking-space-input"
                type="number"
                min="1"
                max={currentWh ? currentWh.availableSpace : 99999}
                required
                value={requiredSpace}
                onChange={e => setRequiredSpace(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="booking-start-date"
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="booking-end-date"
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Select Inventory Items to Store */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Select Items to Store from Your Inventory
              </label>
              <span className="text-[11px] text-slate-400">
                {userInventory.length} registered items
              </span>
            </div>

            {userInventory.length === 0 ? (
              <div className="p-3 border border-dashed border-slate-300 rounded-xl text-center text-slate-500 text-xs bg-slate-50/50">
                <Package className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                <p>You have 0 items in your inventory.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  You can still complete the warehouse booking now and assign items later!
                </p>
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {userInventory.map(item => (
                  <label
                    key={item.id}
                    className="p-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={!!selectedItemIds[item.id]}
                        onChange={() => handleToggleItem(item.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-semibold text-slate-900">{item.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono ml-2">[{item.sku}]</span>
                        <div className="text-[10px] text-slate-500">
                          {item.quantity} {item.unit} • {item.storageRequirement}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {item.category}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Estimated Cost Summary Card */}
          <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Estimated Booking Cost</span>
              <span className="text-xs text-slate-300">
                Based on ${currentWh?.pricePerMonth || 0}/sq ft/month × {requiredSpace || 0} sq ft
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-emerald-400 font-mono">
                ${estimatedCost.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block">subject to approval</span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              id="confirm-booking-btn"
              type="submit"
              disabled={loading || warehouses.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm shadow-blue-500/20 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {loading ? 'Submitting Booking...' : 'Confirm Warehouse Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
