import React, { useState, useEffect } from 'react';
import { InventoryItem, Warehouse, StorageType } from '../types';
import { api } from '../services/api';
import { saveInventoryItemToFirestore, updateInventoryItemInFirestore } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import {
  PackagePlus,
  QrCode,
  UploadCloud,
  Sparkles,
  AlertCircle,
  Check,
  Building2
} from 'lucide-react';
import { BarcodeBadge } from './BarcodeBadge';

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: InventoryItem | null;
}

const STORAGE_TYPES: StorageType[] = [
  'General Ambient',
  'Cold Storage',
  'Climate Controlled',
  'Hazardous Material',
  'High-Security Vault'
];

const CATEGORIES = [
  'Electronics & Hardware',
  'Perishables & Foodstuff',
  'Industrial & Machinery',
  'Apparel & Textiles',
  'Pharmaceuticals & Medical',
  'Chemicals & Hazardous',
  'Consumer Goods',
  'Other'
];

const UNITS = ['Pieces', 'Boxes', 'Pallets', 'Cartons', 'Kilograms (kg)', 'Liters (L)', 'Metric Tons'];

export const AddInventoryModal: React.FC<AddInventoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editItem
}) => {
  const { currentUser } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState(UNITS[0]);
  const [weightSize, setWeightSize] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [barcode, setBarcode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [storageRequirement, setStorageRequirement] = useState<StorageType>('General Ambient');
  const [warehouseId, setWarehouseId] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  useEffect(() => {
    if (isOpen) {
      api.getWarehouses()
        .then(data => setWarehouses(data))
        .catch(() => {});

      if (editItem) {
        setName(editItem.name);
        setSku(editItem.sku);
        setCategory(editItem.category || CATEGORIES[0]);
        setDescription(editItem.description || '');
        setQuantity(editItem.quantity);
        setUnit(editItem.unit || UNITS[0]);
        setWeightSize(editItem.weightSize || '');
        setExpiryDate(editItem.expiryDate || '');
        setBarcode(editItem.barcode || editItem.sku);
        setImageUrl(editItem.imageUrl || '');
        setStorageRequirement(editItem.storageRequirement || 'General Ambient');
        setWarehouseId(editItem.warehouseId || '');
        setLowStockThreshold(editItem.lowStockThreshold || 5);
      } else {
        // Reset form for fresh item
        setName('');
        const randomSku = `SKU-${Math.floor(100000 + Math.random() * 900000)}`;
        setSku(randomSku);
        setBarcode(randomSku);
        setCategory(CATEGORIES[0]);
        setDescription('');
        setQuantity('');
        setUnit(UNITS[0]);
        setWeightSize('');
        setExpiryDate('');
        setImageUrl('');
        setStorageRequirement('General Ambient');
        setWarehouseId('');
        setLowStockThreshold(5);
      }
      setError(null);
    }
  }, [isOpen, editItem]);

  if (!isOpen) return null;

  const handleAutoSku = () => {
    const generated = `SKU-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    setSku(generated);
    if (!barcode) setBarcode(generated);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser) {
      setError('You must be signed in to add inventory.');
      return;
    }

    if (!name || quantity === '') {
      setError('Please provide item name and quantity.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        userId: editItem ? editItem.userId : currentUser.id,
        name,
        sku: sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
        category,
        description,
        quantity: Number(quantity),
        unit,
        weightSize,
        expiryDate: expiryDate || undefined,
        barcode: barcode || sku,
        imageUrl: imageUrl || undefined,
        storageRequirement,
        warehouseId: warehouseId || undefined,
        lowStockThreshold: Number(lowStockThreshold) || 5
      };

      if (editItem) {
        const updated = await api.updateInventory(editItem.id, payload);
        try {
          await updateInventoryItemInFirestore(editItem.id, payload);
        } catch (fsErr) {
          console.warn('Firestore item update notice:', fsErr);
        }
      } else {
        const created = await api.createInventory(payload);
        try {
          await saveInventoryItemToFirestore(created);
        } catch (fsErr) {
          console.warn('Firestore item store notice:', fsErr);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save inventory item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editItem ? 'Edit Inventory Item' : 'Register New Inventory Item'}
              </h2>
              <p className="text-xs text-slate-500">
                Register products into your inventory and optionally assign them to an active warehouse.
              </p>
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Item Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Item / Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="item-name-input"
                type="text"
                required
                placeholder="e.g. Industrial Hydraulic Pump"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SKU with Auto-generate */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Product ID / SKU <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoSku}
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-generate
                </button>
              </div>
              <input
                id="item-sku-input"
                type="text"
                required
                placeholder="SKU-100234"
                value={sku}
                onChange={e => setSku(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                id="item-category-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                id="item-quantity-input"
                type="number"
                min="0"
                required
                placeholder="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit of Measurement
              </label>
              <select
                id="item-unit-select"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {UNITS.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Weight / Size */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Weight / Dimensions
              </label>
              <input
                id="item-weight-input"
                type="text"
                placeholder="e.g. 45 kg / 1.2 m³"
                value={weightSize}
                onChange={e => setWeightSize(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expiry Date (Optional)
              </label>
              <input
                id="item-expiry-input"
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Low stock threshold */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Low Stock Alert Threshold
              </label>
              <input
                id="item-threshold-input"
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="item-desc-input"
              rows={2}
              placeholder="Specifications, handling instructions, batch number, etc."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Storage Requirement & Warehouse Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Storage Requirement
              </label>
              <select
                id="item-storage-select"
                value={storageRequirement}
                onChange={e => setStorageRequirement(e.target.value as StorageType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {STORAGE_TYPES.map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Warehouse Location</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {warehouses.length === 0 ? 'No warehouses created yet' : `${warehouses.length} available`}
                </span>
              </label>
              <select
                id="item-warehouse-select"
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Unassigned (Book Storage Later) --</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.location}) - {w.availableSpace} sq ft avail.
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Barcode & Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Barcode / QR */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Barcode / QR Code String (Optional)
              </label>
              <input
                id="item-barcode-input"
                type="text"
                placeholder="UPC / EAN / Custom"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-2">
                <BarcodeBadge value={barcode || sku || 'SKU-SAMPLE'} />
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Image
              </label>
              <div className="flex items-start gap-3">
                <label className="flex-1 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-3 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/20 transition-colors">
                  <UploadCloud className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <span className="text-[11px] font-semibold text-blue-600 block">Click to upload photo</span>
                  <span className="text-[10px] text-slate-400">PNG, JPG, WebP up to 5MB</span>
                  <input
                    id="item-image-file"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFile}
                    className="hidden"
                  />
                </label>

                {imageUrl && (
                  <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0 relative group">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute inset-0 bg-slate-900/60 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-inventory-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm shadow-blue-500/20 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {loading ? 'Saving Item...' : editItem ? 'Update Item' : 'Register Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
