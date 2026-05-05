import { Unit } from "@devloggers/db-prisma";

export interface CreateUnitDto {
    name: string;
    abbreviation: string;
}

export interface UpdateUnitDto {
    name?: string;
    abbreviation?: string;
    isActive?: boolean;
}

export interface ListUnitsDto extends Pick<Unit,'name' | 'abbreviation'|'isActive'> {}