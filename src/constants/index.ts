import { Column, Status, Priority, ColumnId, FilterOperator } from '../types';

export const getDefaultTableColumns = (): Column[] => [
  { id: 'details', label: '', width: '60px', visible: true, minWidth: 60 },
  { id: 'name', label: 'Subject', width: '350px', visible: true, minWidth: 200 },
  { id: 'status', label: 'Status', width: '160px', visible: true, minWidth: 120 },
  { id: 'assignee', label: 'Assigned To', width: '150px', visible: true, minWidth: 120 },
  { id: 'dates', label: 'Due Date', width: '140px', visible: true, minWidth: 100 },
  { id: 'progress', label: 'Progress', width: '200px', visible: true, minWidth: 150 },
];

export const getDefaultLookaheadColumns = (): Column[] => [
  { id: 'sNo', label: '#', width: '40px', visible: true, minWidth: 20, hideable: false },
  { id: 'name', label: 'Task Name', width: '240px', visible: true, minWidth: 100 },
  { id: 'commitment', label: 'Commitment', width: '120px', visible: true, minWidth: 90 },
  { id: 'actions', label: 'ACTIONS', width: '140px', visible: true, minWidth: 110 },
  { id: 'costCode', label: 'Cost Code', width: '72px', visible: true, minWidth: 48 },
  { id: 'status', label: 'Status', width: '144px', visible: true, minWidth: 120 },
  { id: 'taskType', label: 'Task Type', width: '120px', visible: false, minWidth: 40 },
  { id: 'progress', label: 'Progress', width: '160px', visible: true, minWidth: 80 },
  { id: 'planStart', label: 'Start', width: '80px', visible: true, minWidth: 60 },
  { id: 'planEnd', label: 'End', width: '80px', visible: true, minWidth: 60 },
  { id: 'location', label: 'Location', width: '120px', visible: true, minWidth: 20 },
  { id: 'contractor', label: 'Contractor', width: '180px', visible: true, minWidth: 80 },
  { id: 'crewAssigned', label: 'Crew Assigned', width: '100px', visible: true, minWidth: 40 },
  { id: 'quantity', label: 'Qty', width: '112px', visible: true, minWidth: 85 },
];

export const FILTERABLE_COLUMNS: { id: ColumnId, label: string, type: 'text' | 'enum' }[] = [
    { id: 'name', label: 'Subject', type: 'text' },
    { id: 'status', label: 'Status', type: 'enum' },
    { id: 'priority', label: 'Priority', type: 'enum' },
];

export const TEXT_OPERATORS: { id: FilterOperator, label: string }[] = [
    { id: 'contains', label: 'contains' },
    { id: 'not_contains', label: 'does not contain' },
    { id: 'is', label: 'is' },
    { id: 'is_not', label: 'is not' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is not empty' },
];

export const ENUM_OPERATORS: { id: FilterOperator, label: string }[] = [
    { id: 'is_any_of', label: 'is any of' },
    { id: 'is_none_of', label: 'is none of' },
    { id: 'is_empty', label: 'is empty' },
    { id: 'is_not_empty', label: 'is not empty' },
];

export const getEnumOptions = (columnId: ColumnId): { id: string, label: string }[] => {
    switch (columnId) {
        case 'status':
            return Object.values(Status).map(s => ({ id: s, label: s }));
        case 'priority':
            return Object.values(Priority).map(p => ({ id: p, label: p }));
        default:
            return [];
    }
};
