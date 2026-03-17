import React, { useState, useEffect, useMemo } from 'react';
import { CrewMember } from '../types';
import { XIcon, SearchIcon } from '../../../common/Icons';

interface AddCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedCrewIds: string[]) => void;
  availableCrew: CrewMember[];
  alreadyAssigned: string[];
}

export const AddCrewModal: React.FC<AddCrewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableCrew,
  alreadyAssigned,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(alreadyAssigned));
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(alreadyAssigned));
      setSearchTerm('');
    }
  }, [isOpen, alreadyAssigned]);

  const filteredCrew = useMemo(() => {
    if (!searchTerm.trim()) return availableCrew;
    const q = searchTerm.toLowerCase();
    return availableCrew.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(searchTerm)
    );
  }, [availableCrew, searchTerm]);

  if (!isOpen) return null;

  const toggleCrew = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds));
    onClose();
  };

  const toggleAll = () => {
    const allFilteredSelected = filteredCrew.every(c => selectedIds.has(c.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredCrew.forEach(c => (allFilteredSelected ? next.delete(c.id) : next.add(c.id)));
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6 sm:p-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[calc(100vh-4rem)]">
        <div className="px-5 py-5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Add Crew</h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-500 hover:bg-gray-100" aria-label="Close">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, title, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 pl-5 pr-3 w-14">
                  <input
                    type="checkbox"
                    checked={filteredCrew.length > 0 && filteredCrew.every(c => selectedIds.has(c.id))}
                    ref={el => { if (el) el.indeterminate = filteredCrew.some(c => selectedIds.has(c.id)) && !filteredCrew.every(c => selectedIds.has(c.id)); }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Crew Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Title</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                <th className="text-left py-3 px-4 pr-5 font-semibold text-gray-700">Phone</th>
              </tr>
            </thead>
            <tbody>
              {filteredCrew.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                    {searchTerm.trim() ? 'No crew members match your search.' : 'No crew members available.'}
                  </td>
                </tr>
              ) : filteredCrew.map(crew => (
                <tr
                  key={crew.id}
                  onClick={() => toggleCrew(crew.id)}
                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedIds.has(crew.id) ? 'bg-blue-50/50' : ''}`}
                >
                  <td className="py-3 pl-5 pr-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(crew.id)}
                      onChange={() => toggleCrew(crew.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">{crew.name}</td>
                  <td className="py-3 px-4 text-gray-600">{crew.title}</td>
                  <td className="py-3 px-4 text-gray-600">{crew.email}</td>
                  <td className="py-3 px-4 pr-5 text-gray-600">{crew.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
