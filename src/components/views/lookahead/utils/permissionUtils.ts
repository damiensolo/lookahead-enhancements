export interface LookaheadPermissions {
    /** Whether the task-level planned quantity input is editable */
    canEditPlannedQty: boolean;
    /** Whether the actual quantity section is visible at the task level */
    showActualQtySection: boolean;
    /** Whether actual quantity inputs (mini-table and task level) are editable */
    canEditActualQty: boolean;
    /** Whether numeric entry into day grid cells is allowed */
    canEnterDayActual: boolean;
    /** Whether the right-pane actual quantity field is editable — always false */
    dayPanelActualEditable: false;
}

const RESTRICTED: LookaheadPermissions = {
    canEditPlannedQty: false,
    showActualQtySection: false,
    canEditActualQty: false,
    canEnterDayActual: false,
    dayPanelActualEditable: false,
};

const PERMISSIONS_BY_STATE: Record<string, LookaheadPermissions> = {
    // canonical snake_case keys
    draft: {
        canEditPlannedQty: true,
        showActualQtySection: false,
        canEditActualQty: false,
        canEnterDayActual: false,
        dayPanelActualEditable: false,
    },
    in_review: {
        canEditPlannedQty: true,
        showActualQtySection: false,
        canEditActualQty: false,
        canEnterDayActual: false,
        dayPanelActualEditable: false,
    },
    active: {
        canEditPlannedQty: false,
        showActualQtySection: true,
        canEditActualQty: true,
        canEnterDayActual: true,
        dayPanelActualEditable: false,
    },
};

// Aliases for the existing ScheduleStatus enum values ('Draft', 'In Review', 'Active')
PERMISSIONS_BY_STATE['Draft'] = PERMISSIONS_BY_STATE['draft'];
PERMISSIONS_BY_STATE['In Review'] = PERMISSIONS_BY_STATE['in_review'];
PERMISSIONS_BY_STATE['Active'] = PERMISSIONS_BY_STATE['active'];

/**
 * Pure function — no side effects.
 * Returns the permission set for the given lookahead state string.
 * Accepts either snake_case ('draft', 'in_review', 'active') or the
 * existing ScheduleStatus enum values ('Draft', 'In Review', 'Active').
 * Unknown states fall back to the most restrictive set (all false).
 */
export function getLookaheadPermissions(state: string): LookaheadPermissions {
    return PERMISSIONS_BY_STATE[state] ?? RESTRICTED;
}
