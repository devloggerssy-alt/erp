/**
 * Stable, machine-readable codes for business-rule refusals that the dashboard
 * translates. HTTP status still carries the class of failure; the code carries
 * the specific rule so a server message never has to be shown verbatim.
 */
export const BusinessErrorCode = {
    BRANCH_CODE_TAKEN: 'BRANCH_CODE_TAKEN',
    BRANCH_IN_USE: 'BRANCH_IN_USE',
    BRANCH_DEFAULT_DEACTIVATE: 'BRANCH_DEFAULT_DEACTIVATE',
    BRANCH_NOT_OWNED: 'BRANCH_NOT_OWNED',
    WAREHOUSE_NOT_OWNED: 'WAREHOUSE_NOT_OWNED',
    WAREHOUSE_BRANCH_REQUIRED: 'WAREHOUSE_BRANCH_REQUIRED',
    WAREHOUSE_LAST_BRANCH: 'WAREHOUSE_LAST_BRANCH',
    BRANCH_NOT_FOUND: 'BRANCH_NOT_FOUND',
    CASHBOX_BRANCH_MISMATCH: 'CASHBOX_BRANCH_MISMATCH',
    WAREHOUSE_BRANCH_MISMATCH: 'WAREHOUSE_BRANCH_MISMATCH',
    POS_BRANCH_REQUIRED: 'POS_BRANCH_REQUIRED',
    POS_CASHBOX_BRANCH_MISMATCH: 'POS_CASHBOX_BRANCH_MISMATCH',
    POS_WAREHOUSE_BRANCH_MISMATCH: 'POS_WAREHOUSE_BRANCH_MISMATCH',
} as const

export type BusinessErrorCode = (typeof BusinessErrorCode)[keyof typeof BusinessErrorCode]
