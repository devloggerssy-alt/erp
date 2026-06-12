export interface CreateItemCatalogEntityDto {
  itemId: string
  catalogEntityId: string
}

// Junction records are immutable — update intentionally empty
export interface UpdateItemCatalogEntityDto {}

export interface ListItemCatalogEntitiesDto {
  itemId?: string
  catalogEntityId?: string
}
