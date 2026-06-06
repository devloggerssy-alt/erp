import type { LocalizedString } from './i18n.dto';

export type InvoiceDirection = 'PURCHASE' | 'SALE';

export interface CreateInvoiceTypeDto {
    code: string;
    name: LocalizedString;
    direction: InvoiceDirection;
    affectsStock?: boolean;
}

export interface UpdateInvoiceTypeDto {
    name?: LocalizedString;
    affectsStock?: boolean;
    isActive?: boolean;
}
