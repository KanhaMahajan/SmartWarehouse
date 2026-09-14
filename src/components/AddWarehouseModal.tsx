import React, { useState, useEffect } from 'react';
import { Warehouse, StorageType, User } from '../types';
import { api } from '../services/api';
import { saveWarehouseToFirestore, updateWarehouseInFirestore } from '../services/firestoreService';
import { Building2, AlertCircle, Check } from 'lucide-react';

interface AddWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editWarehouse?: Warehouse | null;
}

const STORAGE_TYPES: StorageType[] = [
  'General Ambient',
  'Cold Storage',
  'Climate Controlled',
  'Hazardous Material',
  'High-Security Vault'
];

export const AddWarehouseModal: React.FC<AddWarehouseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editWarehouse
}) => {
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [totalCapacity, setTotalCapacity] = useState<number | ''>('');
  const [storageType, setStorageType] = useState<StorageType>('General Ambient');
  const [pricePerMonth, setPricePerMonth] = useState<number | ''>(15);
  const [assignedManagerId, setAssignedManagerId] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      api.getUsers()
        .then(users => {
          setManagers(users.filter(u => u.role === 'Warehouse Manager'));
        })
        .catch(() => {});

      if (editWarehouse) {
        setName(editWarehouse.name);
        setLocation(editWarehouse.location);
        setTotalCapacity(editWarehouse.totalCapacity);
        setStorageType(editWarehouse.storageType as StorageType);
        setPricePerMonth(editWarehouse.pricePerMonth);
        setAssignedManagerId(editWarehouse.assignedManagerId || '');
        setDescription(editWarehouse.description || '');
      } else {
        setName('');
        setLocation('');
        setTotalCapacity('');
        setStorageType('General Ambient');
        setPricePerMonth(15);
        setAssignedManagerId('');
        setDescription('');
      }
    }
  }, [isOpen, editWarehouse]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !location || totalCapacity === '') {
      setError('Please provide warehouse name, location, and total capacity.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name,
        location,
        totalCapacity: Number(totalCapacity),
        storageType,
        pricePerMonth: Number(pricePerMonth) || 0,
        assignedManagerId: assignedManagerId || undefined,
        description
      };

      if (editWarehouse) {
        const updated = await api.updateWarehouse(editWarehouse.id, payload);
        try {
          await updateWarehouseInFirestore(editWarehouse.id, payload);
        } catch (fsErr) {
          console.warn('Firestore warehouse update notice:', fsErr);
        }
      } else {
        const created = await api.createWarehouse(payload);
        try {
          await saveWarehouseToFirestore(created);
        } catch (fsErr) {
          console.warn('Firestore warehouse store notice:', fsErr);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save warehouse');
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
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editWarehouse ? 'Edit Warehouse Facility' : 'Create Warehouse Facility'}
              </h2>
              <p className="text-xs text-slate-500">Configure storage capacity, rates, and storage types</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Warehouse Facility Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="warehouse-name-input"
              type="text"
              required
              placeholder="e.g. Apex Central Distribution Center"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Location / City / Zone <span className="text-rose-500">*</span>
            </label>
            <input
              id="warehouse-location-input"
              type="text"
              required
              placeholder="e.g. Chicago Logistics Park, IL - Sector 4"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Capacity (sq ft) <span className="text-rose-500">*</span>
              </label>
              <input
                id="warehouse-capacity-input"
                type="number"
                min="10"
                required
                placeholder="e.g. 50000"
                value={totalCapacity}
                onChange={e => setTotalCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monthly Rate ($/sq ft)
              </label>
              <input
                id="warehouse-price-input"
                type="number"
                min="0"
                step="0.1"
                value={pricePerMonth}
                onChange={e => setPricePerMonth(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Storage Type
              </label>
              <select
                id="warehouse-type-select"
                value={storageType}
                onChange={e => setStorageType(e.target.value as StorageType)}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assign Warehouse Manager
              </label>
              <select
                id="warehouse-manager-select"
                value={assignedManagerId}
                onChange={e => setAssignedManagerId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- No Assigned Manager --</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Facility Description / Amenities
            </label>
            <textarea
              id="warehouse-desc-input"
              rows={2}
              placeholder="Dock doors, 24/7 CCTV, temperature monitors, loading bays, etc."
              value={description}
              onChange={e => setDescription(e.target.value)}
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
              id="submit-warehouse-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm shadow-blue-500/20 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {loading ? 'Saving...' : editWarehouse ? 'Update Facility' : 'Save Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
