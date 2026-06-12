export interface CreateCatalogEntityDto {
  name: string
  kind: string
  parentId?: string | null
  attributes?: Record<string, unknown> | null
}

export interface UpdateCatalogEntityDto {
  name?: string
  kind?: string
  parentId?: string | null
  attributes?: Record<string, unknown> | null
  isActive?: boolean
}

export interface ListCatalogEntitiesDto {
  kind?: string
  parentId?: string | null
  isActive?: boolean
}
