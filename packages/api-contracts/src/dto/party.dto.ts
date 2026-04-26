export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'CUSTOMER_SUPPLIER';

export interface CreatePartyDto {
    code?: string;
    name: string;
    type: PartyType;
    phone?: string;
    email?: string;
    address?: string;
    openingBalance?: number;
}

export interface UpdatePartyDto {
    code?: string;
    name?: string;
    type?: PartyType;
    phone?: string;
    email?: string;
    address?: string;
    openingBalance?: number;
    isActive?: boolean;
}

export interface UpdatePartyStatusDto {
    isActive: boolean;
}
