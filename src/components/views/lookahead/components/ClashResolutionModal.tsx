import React, { useEffect, useState } from 'react';
import { LocationClash, ClashType, ClashResolutionStatus } from '../utils/clashUtils';

interface ClashResolutionModalProps {
  clash: LocationClash | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: LocationClash) => void;
}

const TYPES: ClashType[] = ['Labor congestion', 'Equipment conflict', 'Crane conflict'];
const STATUSES: ClashResolutionStatus[] = ['Resolved', 'Accepted risk'];

export const ClashResolutionModal: React.FC<ClashResolutionModalProps> = ({
  clash,
  isOpen,
  onClose,
  onSave,
}) => {
  const [category, setCategory] = useState<ClashType | ''>('');
  const [status, setStatus] = useState<ClashResolutionStatus | ''>('');

  useEffect(() => {
    if (!isOpen || !clash) {
      setCategory('');
      setStatus('');
      return;
    }
    setCategory(clash.category ?? '');
    setStatus(clash.status === 'Unresolved' ? '' : clash.status);
  }, [isOpen, clash]);

  if (!isOpen || !clash) return null;

  const canSave = !!category && !!status;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      ...clash,
      category: category as ClashType,
      status: status as ClashResolutionStatus,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Clash Resolution</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-4 space-y-4 text-sm">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase">Location</div>
            <div className="text-gray-800">{clash.location}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Overlap start</div>
              <div className="text-gray-800">{clash.overlapStartDate}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase">Overlap end</div>
              <div className="text-gray-800">{clash.overlapEndDate}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase">Tasks</div>
            <div className="text-gray-800">{clash.taskIds.join(', ')}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Clash type
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ClashType | '')}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Select type</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Resolution status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as ClashResolutionStatus | '')
              }
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Select status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

