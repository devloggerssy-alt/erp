export interface CreateUnitDto {
    name: string;
    abbreviation: string;
}

export interface UpdateUnitDto {
    name?: string;
    abbreviation?: string;
    isActive?: boolean;
}
