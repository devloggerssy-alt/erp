"use client"
import { ResourcePage } from '@/shared/data-view/resource'
import { CategoriesClient } from '@devloggers/api-client'
import React from 'react'

export default function page() {
  return (
    <ResourcePage<CategoriesClient>
      columns={(c) => [
        { accessorKey: 'name', },
        { accessorKey: 'description', },
        { accessorKey: 'isActive', },
        c.actionsColumn()
      ]}
      getClient={api => api.categories} />
  )
}
