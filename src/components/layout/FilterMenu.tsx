import React, { useState, useRef, useEffect } from 'react';
import { FilterRule, ColumnId, FilterOperator } from '../../types';
import { FILTERABLE_COLUMNS, TEXT_OPERATORS, ENUM_OPERATORS, getEnumOptions } from '../../constants';
import { PlusIcon, XIcon, ChevronDownIcon } from '../common/Icons';
import { useProject } from '../../context/ProjectContext';

interface FilterMenuProps {
  onClose: () => void;
}

const CustomSelect: React.FC<{ options: { id: string, label: string }[], value: string, onChange: (value: string) => void, placeholder: string }> = ({ options, value, onChange, placeholder }) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-select w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
    >
        <option value="" disabled>{placeholder}</option>
        {options.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
    </select>
);

const EnumMultiSelect: React.FC<{ options: { id: string, label: string }[], selected: string[], onChange: (selected: string[]) => void }> = ({ options, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const toggleOption = (id: string) => {
        const newSelected = selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id];
        onChange(newSelected);
    };
    
    const displayLabel = selected.length > 0 ? options.filter(o => selected.includes(o.id)).map(o => o.label).join(', ') : 'Select...';

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <button onClick={() => setIsOpen(p => !p)} className="w-full flex justify-between items-center px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-left">
                <span className="truncate">{displayLabel}</span>
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 z-10 max-h-48 overflow-y-auto">
                    <ul>
                        {options.map(opt => (
                            <li key={opt.id} className="p-2 hover:bg-gray-100">
                                <label className="flex items-center text-sm">
                                    <input type="checkbox" checked={selected.includes(opt.id)} onChange={() => toggleOption(opt.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2" />
                                    {opt.label}
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};


const FilterMenu: React.FC<FilterMenuProps> = ({ onClose }) => {
    const { activeView, setFilters } = useProject();
    const { filters } = activeView;
    const menuRef = useRef<HTMLDivElement>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newRule, setNewRule] = useState<{ columnId?: ColumnId; operator?: FilterOperator; value?: string | string[] }>({});

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const addFilter = () => {
        if (!newRule.columnId || !newRule.operator) return;
        
        const isValueRequired = !['is_empty', 'is_not_empty'].includes(newRule.operator);
        if (isValueRequired && (newRule.value === undefined || (Array.isArray(newRule.value) && newRule.value.length === 0))) return;
        
        const finalRule: FilterRule = {
            id: `filter_${Date.now()}`,
            columnId: newRule.columnId,
            operator: newRule.operator,
            value: newRule.value,
        };
        setFilters([...filters, finalRule]);
        setNewRule({});
        setIsAdding(false);
    };
    
    const removeFilter = (id: string) => setFilters(filters.filter(f => f.id !== id));
    
    const selectedColumn = FILTERABLE_COLUMNS.find(c => c.id === newRule.columnId);
    const operators = selectedColumn?.type === 'text' ? TEXT_OPERATORS : ENUM_OPERATORS;
    const requiresValue = newRule.operator && !['is_empty', 'is_not_empty'].includes(newRule.operator);

    const getDisplayValue = (rule: FilterRule) => {
        if (!rule.value || Array.isArray(rule.value) && rule.value.length === 0) return '';
        if (['is_empty', 'is_not_empty'].includes(rule.operator)) return '';

        if (Array.isArray(rule.value)) {
            const options = getEnumOptions(rule.columnId);
            return rule.value.map(v => options.find(o => o.id === v)?.label || v).join(', ');
        }
        return `"${rule.value}"`;
    };

    return (
        <div ref={menuRef} className="absolute top-full left-0 mt-2 w-96 bg-white rounded-md shadow-lg border border-gray-200 z-50 flex flex-col p-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Filter</h3>
            
            <div className="space-y-2 mb-3">
                {filters.map(rule => (
                    <div key={rule.id} className="flex items-center gap-1 text-sm bg-gray-100 p-1.5 rounded-md">
                        <span className="font-medium text-gray-600">{FILTERABLE_COLUMNS.find(c => c.id === rule.columnId)?.label}</span>
                        <span className="text-gray-500">{[...TEXT_OPERATORS, ...ENUM_OPERATORS].find(o => o.id === rule.operator)?.label}</span>
                        <span className="font-medium text-gray-600 truncate">{getDisplayValue(rule)}</span>
                        <button onClick={() => removeFilter(rule.id)} className="ml-auto p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200"><XIcon className="w-3 h-3" /></button>
                    </div>
                ))}
            </div>

            {isAdding && (
                <div className="p-2 border border-gray-200 rounded-md mb-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                         <CustomSelect
                            options={FILTERABLE_COLUMNS.map(c => ({ id: c.id, label: c.label }))}
                            value={newRule.columnId || ''}
                            onChange={(val) => setNewRule({ columnId: val as ColumnId })}
                            placeholder="Column"
                        />
                        {newRule.columnId && <CustomSelect
                            options={operators}
                            value={newRule.operator || ''}
                            onChange={(val) => setNewRule(p => ({ ...p, operator: val as FilterOperator }))}
                            placeholder="Operator"
                        />}
                    </div>
                    {requiresValue && selectedColumn && (
                        <div>
                           {selectedColumn.type === 'text' ? (
                                <input
                                    type="text"
                                    value={newRule.value as string || ''}
                                    onChange={e => setNewRule(p => ({...p, value: e.target.value}))}
                                    placeholder="Enter value..."
                                    className="form-input w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                           ) : (
                                <EnumMultiSelect
                                    options={getEnumOptions(selectedColumn.id)}
                                    selected={newRule.value as string[] || []}
                                    onChange={val => setNewRule(p => ({ ...p, value: val }))}
                                />
                           )}
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-1">
                        <button onClick={() => { setIsAdding(false); setNewRule({}) }} className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                        <button onClick={addFilter} className="px-3 py-1 text-sm font-medium text-white bg-zinc-800 rounded-md hover:bg-zinc-700">Apply</button>
                    </div>
                </div>
            )}

            <button onClick={() => setIsAdding(true)} className="flex items-center gap-1 text-sm text-blue-600 font-medium p-1 hover:bg-blue-50 rounded-md">
                <PlusIcon className="w-4 h-4" />
                Add filter
            </button>
        </div>
    );
};

export default FilterMenu;