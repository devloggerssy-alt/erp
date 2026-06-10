export const customFieldModules = {
    items: 'items',
} as const

export type CustomFieldModule = (typeof customFieldModules)[keyof typeof customFieldModules]
