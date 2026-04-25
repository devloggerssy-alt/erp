export const CASHBOXES = {
    ROOT: "cashboxes",
    BY_ID: "cashboxes/:id",
} as const;

export const PAYMENTS = {
    ROOT: "payments",
    BY_ID: "payments/:id",
    POST: "payments/:id/post",
    CANCEL: "payments/:id/cancel",
    ALLOCATE: "payments/:id/allocate",
    DEALLOC: "payments/:id/allocations/:allocationId",
} as const;
