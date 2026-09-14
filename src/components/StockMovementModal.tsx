import React, { useState, useEffect } from 'react';
import { InventoryItem, Warehouse } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  AlertCircle,
  Check
} from 'lucide-react';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preSelectedItem?: InventoryItem | null;
  filterWarehouseId?: string;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preSelectedItem,
  filterWarehouseId
}) => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedItemId, setSelectedItemId] = useState('');
  const [movementType, setMovementType] = useState<'Stock In' | 'Stock Out'>('Stock In');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [warehouseId, setWarehouseId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      api.getInventory({ warehouseId: filterWarehouseId })
        .then(data => {
          setItems(data);
          if (preSelectedItem) {
            setSelectedItemId(preSelectedItem.id);
            setWarehouseId(preSelectedItem.warehouseId || '');
          } else if (data.length > 0 && !selectedItemId) {
            setSelectedItemId(data[0].id);
            setWarehouseId(data[0].warehouseId || '');
          }
        })
        .catch(() => {});

      api.getWarehouses()
        .then(data => setWarehouses(data))
        .catch(() => {});
    }
  }, [isOpen, preSelectedItem, filterWarehouseId]);

  if (!isOpen) return null;

  const currentItem = items.find(i => i.id === selectedItemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedItemId) {
      setError('Please select an item.');
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setError('Please enter a valid positive quantity.');
      return;
    }

    if (movementType === 'Stock Out' && currentItem && Number(quantity) > currentItem.quantity) {
      setError(
        `Cannot stock out ${quantity} ${currentItem.unit}. Only ${currentItem.quantity} ${currentItem.unit} available in current stock.`
      );
      return;
    }

    try {
      setLoading(true);
      await api.createStockMovement({
        warehouseId: warehouseId || currentItem?.warehouseId,
        itemId: selectedItemId,
        movementType,
        quantity: Number(quantity),
        reason: reason || (movementType === 'Stock In' ? 'Inbound restock' : 'Outbound dispatch'),
        performedBy: currentUser ? currentUser.name : 'Manager',
        performedByRole: currentUser ? currentUser.role : 'Warehouse Manager'
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Stock Movement</h2>
              <p className="text-xs text-slate-500">Perform Stock In (receiving) or Stock Out (dispatching)</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Movement Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Operation Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMovementType('Stock In')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  movementType === 'Stock In'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                Stock In (Receiving)
              </button>

              <button
                type="button"
                onClick={() => setMovementType('Stock Out')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  movementType === 'Stock Out'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                Stock Out (Dispatch)
              </button>
            </div>
          </div>

          {/* Select Item */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Inventory Item <span className="text-rose-500">*</span>
            </label>
            {items.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                No items available in the system yet. Register an inventory item first.
              </div>
            ) : (
              <select
                id="movement-item-select"
                value={selectedItemId}
                onChange={e => {
                  setSelectedItemId(e.target.value);
                  const found = items.find(i => i.id === e.target.value);
                  if (found) setWarehouseId(found.warehouseId || '');
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {items.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.name} [{it.sku}] — Current Stock: {it.quantity} {it.unit} ({it.warehouseName || 'Unassigned'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Current Stock Preview Card */}
          {currentItem && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Current On-Hand Balance</span>
                <span className="font-bold text-slate-900 text-sm">
                  {currentItem.quantity} {currentItem.unit}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Owner: {currentItem.userName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">Status</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    currentItem.status === 'In Stock'
                      ? 'bg-emerald-100 text-emerald-800'
                      : currentItem.status === 'Low Stock'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {currentItem.status}
                </span>
              </div>
            </div>
          )}

          {/* Quantity & Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity to Move <span className="text-rose-500">*</span>
              </label>
              <input
                id="movement-quantity-input"
                type="number"
                min="1"
                required
                placeholder="Enter units"
                value={quantity}
                onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Facility / Warehouse
              </label>
              <select
                id="movement-warehouse-select"
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Use Item Default --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.location})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Movement Reason / Reference Note
            </label>
            <input
              id="movement-reason-input"
              type="text"
              placeholder="e.g. Shipment received via Carrier ABC / Customer Order #4102"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              id="submit-movement-btn"
              type="submit"
              disabled={loading || items.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm shadow-blue-500/20 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {loading ? 'Processing...' : `Execute ${movementType}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
