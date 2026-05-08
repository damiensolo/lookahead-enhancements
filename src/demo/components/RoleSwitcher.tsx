import React from 'react';
import { DEMO_PROJECT, DEMO_SUBS, DemoRole } from '../data/lookahead-demo-data';

export const RoleSwitcher: React.FC<{
  activeRole: DemoRole;
  onChangeRole: (role: DemoRole) => void;
}> = ({ activeRole, onChangeRole }) => {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white p-0.5 shadow-sm">
      <RoleTab
        id="demo-role-gc"
        label="General Contractor View"
        active={activeRole === 'gc'}
        onClick={() => onChangeRole('gc')}
      />
      <RoleTab
        id="demo-role-apex"
        label="Apex Electrical View"
        active={activeRole === 'apex-electrical'}
        onClick={() => onChangeRole('apex-electrical')}
      />
      <RoleTab
        id="demo-role-blueline"
        label="Blueline Mechanical View"
        active={activeRole === 'blueline-mechanical'}
        onClick={() => onChangeRole('blueline-mechanical')}
      />
    </div>
  );
};

const RoleTab: React.FC<{ id?: string; label: string; active: boolean; onClick: () => void }> = ({
  id,
  label,
  active,
  onClick,
}) => (
  <button
    type="button"
    id={id}
    onClick={onClick}
    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
      active ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
    }`}
  >
    {label}
  </button>
);

