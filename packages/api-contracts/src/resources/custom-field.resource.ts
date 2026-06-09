import { defineCrudResource } from './base/crud-resource'

export const customFieldResource = defineCrudResource({
    key: 'custom-fields',
    routes: {
        list: '/custom-fields',
        show: '/custom-fields/{id}',
        create: '/custom-fields',
        update: '/custom-fields/{id}',
        delete: '/custom-fields/{id}',
    },
})
