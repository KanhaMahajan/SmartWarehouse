import React, { useState, useEffect } from 'react';
import { InventoryItem, Warehouse } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Building2,
  AlertTriangle,
  Boxes,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { BarcodeBadge } from '../components/BarcodeBadge';

interface MyInventoryPageProps {
  onOpenAddInventory: (item?: InventoryItem) => void;
  onOpenBookWarehouse: () => void;
}

export const MyInventoryPage: React.FC<MyInventoryPageProps> = ({
  onOpenAddInventory,
  onOpenBookWarehouse
}) => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('All');

  // Deletion confirm
  const [deleteCandidate, setDeleteCandidate] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadInventory = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [invData, whData] = await Promise.all([
        api.getInventory({ userId: currentUser.id }),
        api.getWarehouses()
      ]);
      setItems(invData);
      setWarehouses(whData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [currentUser]);

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setDeleting(true);
      await api.deleteInventory(deleteCandidate.id);
      setItems(prev => prev.filter(i => i.id !== deleteCandidate.id));
      setDeleteCandidate(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  // Categories list
  const categories = ['All', ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))];

  // Filtered items
  const filteredItems = items.filter(item => {
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.warehouseName && item.warehouseName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus;
    const matchesWarehouse =
      selectedWarehouseFilter === 'All' ||
      (selectedWarehouseFilter === 'unassigned' ? !item.warehouseId : item.warehouseId === selectedWarehouseFilter);

    return matchesSearch && matchesCategory && matchesStatus && matchesWarehouse;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-6 h-6 text-blue-600" />
            My Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View, search, edit, and manage all your registered products and storage allocations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onOpenAddInventory()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-blue-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            + Add Inventory
          </button>
        </div>
      </div>

      {/* Control Bar: Search & Filter */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            id="inventory-search-input"
            type="text"
            placeholder="Search by name, SKU, or category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            id="filter-category"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(c => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            id="filter-status"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>

          {/* Warehouse Filter */}
          <select
            id="filter-warehouse"
            value={selectedWarehouseFilter}
            onChange={e => setSelectedWarehouseFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Facilities</option>
            <option value="unassigned">Unassigned / No Warehouse</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Inventory Table / Cards */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7" />
            </div>
            {items.length === 0 ? (
              <>
                <h3 className="text-base font-bold text-slate-900">My Inventory: 0 Items</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  There are no products in your inventory. Use the form to register your products and track stock.
                </p>
                <button
                  onClick={() => onOpenAddInventory()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  + Add Inventory
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-slate-900">No matching items found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Try adjusting your search query or removing active filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setSelectedStatus('All');
                    setSelectedWarehouseFilter('All');
                  }}
                  className="mt-3 text-xs text-blue-600 font-bold hover:underline"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Product / Item</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Quantity &amp; Unit</th>
                  <th className="py-3.5 px-4">Warehouse Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Barcode / SKU</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Item Name & Thumb */}
                    <td className="py-3.5 px-4">
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
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{item.sku}</div>
                          {item.description && (
                            <div className="text-[10px] text-slate-500 line-clamp-1 max-w-xs mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {item.category}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.storageRequirement}
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 font-mono text-sm">
                        {item.quantity} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                      </div>
                      {item.weightSize && (
                        <div className="text-[10px] text-slate-400">{item.weightSize}</div>
                      )}
                    </td>

                    {/* Warehouse Location */}
                    <td className="py-3.5 px-4">
                      {item.warehouseName ? (
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{item.warehouseName}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                          <button
                            onClick={onOpenBookWarehouse}
                            className="text-[10px] text-blue-600 font-bold hover:underline"
                          >
                            Book Storage
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status */}
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

                    {/* Barcode / SKU */}
                    <td className="py-3.5 px-4">
                      <BarcodeBadge value={item.barcode || item.sku} className="scale-85 origin-left" />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onOpenAddInventory(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteCandidate(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete item"
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

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Item?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove <span className="font-semibold text-slate-800">"{deleteCandidate.name}"</span> from your inventory? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
