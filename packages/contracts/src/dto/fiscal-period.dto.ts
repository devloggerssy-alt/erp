export interface CreateFiscalPeriodDto {
    name: string;
    startDate: string; // ISO date string
    endDate: string;
}

export interface UpdateFiscalPeriodDto {
    name?: string;
    startDate?: string;
    endDate?: string;
    status?: 'OPEN' | 'CLOSED' | 'LOCKED';
}
