export type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'CUSTOMER_SUPPLIER';

export interface UpdatePartyStatusDto {
    isActive: boolean;
}
