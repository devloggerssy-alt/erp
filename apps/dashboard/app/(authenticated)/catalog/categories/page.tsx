import { ResourcePage } from '@/shared/data-view/resource'
import {CategoriesClient} from '@devloggers/api-client'
import React from 'react'
 
export default function page() {
  return (
    <ResourcePage<CategoriesClient>
    columns={c=>[
        {accessorKey:''}
    ]}
    getClient={api=>api.categories} />
  )
}
