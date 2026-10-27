import React, { useState } from 'react';
import {
  X,
  UserCheck,
  DoorOpen,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { AdminUser } from '../types';
import { getAdmins, getCurrentAdmin, setCurrentAdmin } from '../services/storage';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminChanged: (admin: AdminUser) => void;
  onOpenStudentScanner?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onAdminChanged,
  onOpenStudentScanner,
}) => {
  const admins = getAdmins();
  const current = getCurrentAdmin();

  const [selectedAdminId, setSelectedAdminId] = useState(current.id);
  const [customGate, setCustomGate] = useState(current.gateAssigned);

  if (!isOpen) return null;

  const handleSelectAdmin = (admin: AdminUser) => {
    setSelectedAdminId(admin.id);
    setCustomGate(admin.gateAssigned);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const admin = admins.find((a) => a.id === selectedAdminId) || admins[0];
    const updatedAdmin: AdminUser = {
      ...admin,
      gateAssigned: customGate.trim() || admin.gateAssigned,
    };
    setCurrentAdmin(updatedAdmin);
    onAdminChanged(updatedAdmin);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white border-2 border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Admin &amp; Gate Authentication</h2>
              <p className="text-xs text-slate-500">Role-based gate access &amp; audit signing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleApply} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Authorized Admin Profile
            </label>
            <div className="space-y-2">
              {admins.map((adm) => {
                const isSelected = adm.id === selectedAdminId;
                return (
                  <div
                    key={adm.id}
                    onClick={() => handleSelectAdmin(adm)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{adm.name}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {adm.roleTitle}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {adm.department} · {adm.email}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                  </div>
                );
              })}
            </div>

            {onOpenStudentScanner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenStudentScanner();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-xs font-bold text-orange-700 flex items-center justify-center gap-2 transition-colors mt-2"
              >
                <UserPlus className="w-4 h-4 text-orange-600" />
                <span>+ Authorize Other Student Scanners by Email</span>
              </button>
            )}
          </div>

          {/* Assigned Gate override */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Assigned Gate Location
            </label>
            <div className="relative">
              <input
                type="text"
                value={customGate}
                onChange={(e) => setCustomGate(e.target.value)}
                placeholder="e.g. Gate 1 (North Concourse) or Auditorium West"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-orange-500 rounded-xl text-xs text-slate-900 focus:outline-none font-medium"
              />
              <DoorOpen className="w-4 h-4 text-orange-500 absolute left-3 top-3" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              All scans completed will be stamped with this gate and your admin ID.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>Confirm &amp; Log In</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
