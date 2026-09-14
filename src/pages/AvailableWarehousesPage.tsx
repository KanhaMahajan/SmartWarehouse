import React, { useState, useEffect } from 'react';
import { Warehouse } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  CalendarCheck,
  MapPin,
  Maximize2,
  DollarSign,
  ShieldCheck,
  Search,
  Filter,
  AlertCircle
} from 'lucide-react';

interface AvailableWarehousesPageProps {
  onOpenBookWarehouse: (wh?: Warehouse) => void;
  onOpenAddWarehouse?: () => void;
}

export const AvailableWarehousesPage: React.FC<AvailableWarehousesPageProps> = ({
  onOpenBookWarehouse,
  onOpenAddWarehouse
}) => {
  const { currentUser } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const data = await api.getWarehouses();
      setWarehouses(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const types = ['All', ...Array.from(new Set(warehouses.map(w => w.storageType).filter(Boolean)))];

  const filtered = warehouses.filter(w => {
    const matchesSearch =
      searchQuery === '' ||
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.storageType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All' || w.storageType === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-600" />
            Available Warehouses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Browse verified storage facilities created by administrators and book space for your inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser?.role === 'Admin' && onOpenAddWarehouse && (
            <button
              onClick={onOpenAddWarehouse}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2"
            >
              + Create Warehouse Facility
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      {warehouses.length > 0 && (
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by facility name, city, or storage type..."
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
              {types.map(t => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Storage Types' : t}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Grid of Warehouses */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          {warehouses.length === 0 ? (
            <>
              <h3 className="text-base font-bold text-slate-900">
                Available Warehouses: No warehouses available
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                There are no warehouses created in the system yet. As an Administrator, create facilities to make storage capacity available for users.
              </p>
              {currentUser?.role === 'Admin' && onOpenAddWarehouse ? (
                <button
                  onClick={onOpenAddWarehouse}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  + Add First Warehouse
                </button>
              ) : (
                <p className="text-[11px] text-blue-600 font-semibold">
                  Tip: Switch to the Admin account using the top menu to create warehouses.
                </p>
              )}
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-slate-900">No matching facilities found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Try searching with different keywords or reset your storage type filter.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(wh => {
            const used = wh.totalCapacity - wh.availableSpace;
            const pct = wh.totalCapacity > 0 ? Math.round((used / wh.totalCapacity) * 100) : 0;
            const isFull = wh.availableSpace <= 0;
            const isAlmostFull = pct >= 80 && !isFull;

            return (
              <div
                key={wh.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {wh.storageType}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1.5">{wh.name}</h3>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        isFull
                          ? 'bg-rose-100 text-rose-800'
                          : isAlmostFull
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isFull ? 'Occupied' : isAlmostFull ? 'Almost Full' : 'Available'}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{wh.location}</span>
                  </div>

                  {/* Description if any */}
                  {wh.description && (
                    <p className="text-[11px] text-slate-600 mb-4 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {wh.description}
                    </p>
                  )}

                  {/* Capacity Meter */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">Occupancy Rate</span>
                      <span className="font-bold text-slate-800 font-mono text-[11px]">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 85 ? 'bg-amber-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Total: {wh.totalCapacity.toLocaleString()} sq ft</span>
                      <span className="font-semibold text-blue-700">
                        {wh.availableSpace.toLocaleString()} sq ft avail.
                      </span>
                    </div>
                  </div>

                  {/* Manager Assigned */}
                  {wh.assignedManagerName && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Facility Manager: <strong className="text-slate-700">{wh.assignedManagerName}</strong></span>
                    </div>
                  )}
                </div>

                {/* Bottom Card Footer */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Pricing</span>
                    <div className="text-xs font-bold text-slate-900">
                      ${wh.pricePerMonth}{' '}
                      <span className="text-[10px] font-normal text-slate-500">/ sq ft / month</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      id={`book-warehouse-btn-${wh.id}`}
                      onClick={() => onOpenBookWarehouse(wh)}
                      disabled={isFull}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      {isFull ? 'Fully Booked' : 'Book Storage'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
