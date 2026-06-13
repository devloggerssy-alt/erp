export interface CreateBrandDto {
  name: string
  imageUrl?: string | null
}

export interface UpdateBrandDto {
  name?: string
  imageUrl?: string | null
  isActive?: boolean
}

export interface ListBrandsDto {
  isActive?: boolean
}
