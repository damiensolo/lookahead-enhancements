import React from 'react';
import { DEMO_PROJECT, DEMO_SUBS, DemoRole } from '../data/lookahead-demo-data';

export const RoleSwitcher: React.FC<{
  activeRole: DemoRole;
  onChangeRole: (role: DemoRole) => void;
}> = ({ activeRole, onChangeRole }) => {
  return (
    <div className="inline-flex items-center gap-1 rounded-md bg-gray-800 p-0.5 shadow-lg">
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
      active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-200 hover:bg-gray-700 hover:text-white'
    }`}
  >
    {label}
  </button>
);

