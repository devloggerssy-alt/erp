export const DEPARTMENT_ASSIGNMENT_TYPE_OPTIONS = [
    { value: "none", label: "None" },
    { value: "bays", label: "Bays" },
    { value: "outsourced", label: "Outsourced" },
] as const

export type DepartmentAssignmentType = typeof DEPARTMENT_ASSIGNMENT_TYPE_OPTIONS[number]["value"]
