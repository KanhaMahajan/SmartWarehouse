import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';
import { saveUserToFirestore } from '../services/firestoreService';
import { UserPlus, AlertCircle, Check } from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editUser?: User | null;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editUser
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('User');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (editUser) {
        setName(editUser.name);
        setEmail(editUser.email);
        setPhone(editUser.phone || '');
        setPassword('');
        setRole(editUser.role);
        setStatus(editUser.status);
      } else {
        setName('');
        setEmail('');
        setPhone('');
        setPassword('password123');
        setRole('User');
        setStatus('Active');
      }
    }
  }, [isOpen, editUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email) {
      setError('Please provide name and email.');
      return;
    }

    try {
      setLoading(true);
      let savedUser: User;
      if (editUser) {
        savedUser = await api.updateUser(editUser.id, {
          name,
          email,
          phone,
          role,
          status,
          ...(password ? { password } : {})
        });
      } else {
        savedUser = await api.createUser({
          name,
          email,
          phone,
          password: password || 'pass123',
          role,
          status
        });
      }

      // Persist user in Firestore
      try {
        await saveUserToFirestore(savedUser);
      } catch (fsErr) {
        console.warn('Firestore user save notice:', fsErr);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editUser ? 'Edit User Record' : 'Add New System User'}
              </h2>
              <p className="text-xs text-slate-500">Configure access credentials and assigned role</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="user-name-input"
              type="text"
              required
              placeholder="e.g. Alice Cooper"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="user-email-input"
              type="email"
              required
              placeholder="alice@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number
            </label>
            <input
              id="user-phone-input"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {editUser ? 'Change Password (Leave blank to keep current)' : 'Initial Password'}
            </label>
            <input
              id="user-password-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Role
              </label>
              {editUser?.role === 'Admin' ? (
                <div>
                  <select
                    id="user-role-select"
                    value="Admin"
                    disabled
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-100 text-slate-700 cursor-not-allowed font-semibold"
                  >
                    <option value="Admin">👑 Admin (Unique & Permanent)</option>
                  </select>
                </div>
              ) : (
                <select
                  id="user-role-select"
                  value={role === 'Admin' ? 'User' : role}
                  onChange={e => setRole(e.target.value as Role)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="User">User (Client Account)</option>
                  <option value="Warehouse Manager">Warehouse Manager</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Status
              </label>
              {editUser?.role === 'Admin' ? (
                <select
                  id="user-status-select"
                  value="Active"
                  disabled
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-100 text-slate-700 cursor-not-allowed font-semibold"
                >
                  <option value="Active">Active (Protected Admin)</option>
                </select>
              ) : (
                <select
                  id="user-status-select"
                  value={status}
                  onChange={e => setStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive / Deactivated</option>
                </select>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
            <span className="text-blue-600 font-bold">🔒</span>
            <div>
              <span className="font-semibold text-slate-800">Single-Admin System Constraint:</span>{' '}
              {editUser?.role === 'Admin'
                ? 'The primary Admin account cannot be demoted, duplicated, or transferred. Use the System Recovery process if credentials need resetting.'
                : 'The system permits exactly ONE permanent Admin account. New accounts can only be provisioned as Users or Warehouse Managers.'}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              id="submit-user-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm shadow-blue-500/20 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {loading ? 'Saving...' : editUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
