import React, { useState, useEffect } from 'react';
import { StockMovement } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  Calendar,
  Building2,
  Package,
  Plus
} from 'lucide-react';

interface StockMovementsPageProps {
  onOpenStockMovementModal?: () => void;
}

export const StockMovementsPage: React.FC<StockMovementsPageProps> = ({ onOpenStockMovementModal }) => {
  const { currentUser } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  const loadMovements = async () => {
    try {
      setLoading(true);
      const data = await api.getStockMovements();
      setMovements(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, []);

  const filtered = movements.filter(m => {
    const matchesSearch =
      searchQuery === '' ||
      m.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.warehouseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.reason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All' || m.movementType === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            Stock Movement &amp; Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete real-time ledger of inbound receiving, outbound dispatches, and inventory adjustments.
          </p>
        </div>

        {(currentUser?.role === 'Admin' || currentUser?.role === 'Warehouse Manager') && onOpenStockMovementModal && (
          <button
            onClick={onOpenStockMovementModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Record Movement (In/Out)
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU, warehouse, or reference..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
          >
            <option value="All">All Movements</option>
            <option value="Stock In">Stock In</option>
            <option value="Stock Out">Stock Out</option>
          </select>
        </div>
      </div>

      {/* Movement Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <ArrowLeftRight className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Stock Movement Recorded</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Stock In and Stock Out records will automatically populate here as items are registered, approved, and dispatched.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Product Item</th>
                  <th className="py-3.5 px-4">Warehouse</th>
                  <th className="py-3.5 px-4">Moved Qty</th>
                  <th className="py-3.5 px-4">Stock Balance Change</th>
                  <th className="py-3.5 px-4">Reason / Reference</th>
                  <th className="py-3.5 px-4">Operator</th>
                  <th className="py-3.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.movementType === 'Stock In'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {m.movementType === 'Stock In' ? (
                          <ArrowDownLeft className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        <span>{m.movementType}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{m.itemName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{m.sku}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800">{m.warehouseName}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold font-mono text-slate-900">
                        {m.movementType === 'Stock In' ? `+${m.quantity}` : `-${m.quantity}`} {m.unit}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {m.previousQuantity} &rarr; <span className="font-bold text-slate-900">{m.newQuantity}</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {m.reason}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{m.performedBy}</div>
                      <div className="text-[10px] text-slate-400">{m.performedByRole}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right text-slate-500 font-mono text-[11px]">
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
