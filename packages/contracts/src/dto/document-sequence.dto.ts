export interface CreateDocumentSequenceDto {
    documentType: string;
    prefix: string;
    nextNumber?: number;
    padding?: number;
}

export interface UpdateDocumentSequenceDto {
    prefix?: string;
    nextNumber?: number;
    padding?: number;
}
