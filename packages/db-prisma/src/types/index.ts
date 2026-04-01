export type SchemaFieldType = 'text' | 'number' | 'password' | 'textarea' | 'select' | 'image';
export interface SchemaField {
    key: string;              // اسم المتغير في JSON (مثلاً: iban)
    label: string;            // الاسم الظاهر (مثلاً: رقم الآيبان)
    type: SchemaFieldType;    // نوع الحقل
    required?: boolean;       // هل هو إجباري؟
    placeholder?: string;     // نص توضيحي باهت
    validationRegex?: string; // (اختياري) للتحقق، مثلاً ^SA\d{22}$
    options?: string[];       // (اختياري) إذا كان النوع select
    helperText?: string;      // نص مساعدة صغير تحت الحقل
}
export interface PaymentInputSchema {
    fields: SchemaField[];
    instructionsTemplate?: string; // قالب لعرض التعليمات للعميل، مثلاً: "حول إلى {accountNumber}"
}