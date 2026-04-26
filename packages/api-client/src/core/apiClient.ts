// نفترض أن الملف السابق هنا
import { ApiErrorCode, type ApiErrorResponse, ApiSuccessResponse } from "@devloggers/contracts";
import {
    FetchHttpClient,
    FetchHttpClientConfig,
    HttpError
} from "./fetchHttpClient";

// 1. Config Interface
export type ApiConfig = {
    token?: string | (() => string | null); // مرن لقبول دالة تجلب التوكن
    locale?: string;
    baseUrl?: string;
};

// 2. The ApiClient Class
export class ApiClient {
    constructor(
        private httpClient: FetchHttpClient,
        private config: ApiConfig = {}
    ) { }

    // دالة مساعدة لتحديث التوكن أو اللغة في أي وقت
    setConfig(newConfig: Partial<ApiConfig>) {
        this.config = { ...this.config, ...newConfig };
    }

    // --- The Main Fetch Method ---
    async fetch<T>(url: string, options: Partial<FetchHttpClientConfig> = {}) {

        // A. تحضير الهيدرز الخاصة بالبزنس (Auth + Locale)
        const headers = this.prepareHeaders(options.headers);
        const baseUrl = this.config.baseUrl || options.baseUrl;

        try {
            // B. استدعاء الـ HttpClient (المستوى المنخفض)
            const response = await this.httpClient.fetch<ApiSuccessResponse<T>>(url, {
                ...options,
                baseUrl,
                headers,
            });

            // C. حالة النجاح (Success Path)
            // نقوم بدمج الهيدرز مع البيانات في حال احتجنا لشيء منها (مثل Pagination links)
            // ونضمن أن الـ status هو success
            return {
                ...response.data,
                status: 'success', // تأكيد للتايب سكريبت
                // إذا كنت تحتاج الهيدرز في الـ UI، يمكنك إضافتها هنا، لكن العقد ApiResponse لا يحتويها عادة
                // headers: response.headers 
            };

        } catch (error) {
            // D. حالة الفشل (Error Path) - هنا تحدث "الترجمة"
            return this.handleError(error);
        }
    }

    // --- Helper Methods ---

    // 1. تجهيز الهيدرز تلقائياً
    private prepareHeaders(existingHeaders?: HeadersInit): Record<string, string> {
        const headers: Record<string, string> = {};

        // إضافة اللغة
        if (this.config.locale) {
            headers['Accept-Language'] = this.config.locale;
        }

        // إضافة التوكن (سواء كان نصاً أو دالة)
        const token = typeof this.config.token === 'function'
            ? this.config.token()
            : this.config.token;

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // دمج الهيدرز القادمة من الطلب (لها الأولوية)
        if (existingHeaders) {
            if (existingHeaders instanceof Headers) {
                existingHeaders.forEach((v, k) => headers[k] = v);
            } else if (!Array.isArray(existingHeaders)) {
                Object.assign(headers, existingHeaders);
            }
        }

        return headers;
    }

    // 2. معالجة الأخطاء وتحويلها لـ ApiResponse
    private handleError(error: unknown): ApiErrorResponse {
        // السيناريو الأول: الخطأ معروف ومصدره الباكند (HttpError)
        if (error instanceof HttpError) {
            const body = error.body;

            // هل الباكند أرسل JSON مهيكل نعرفه؟ (Validation errors, etc)
            if (body && typeof body === 'object' && body.status === 'error') {
                return body as ApiErrorResponse;
            }

            // الباكند أرسل خطأ لكن ليس بالهيكلية المتوقعة (مثلاً 500 HTML صفحة بيضاء)
            // أو 404 Not Found من الـ Server (Nginx) وليس التطبيق
            return {
                status: 'error',
                code: this.mapStatusCodeToErrorCode(error.status),
                message: error.message || 'Something went wrong',
                // يمكننا إضافة الـ traceId إذا كان موجوداً في الهيدرز
            };
        }

        // السيناريو الثاني: خطأ في الشبكة أو كود JS (لم يصل للخادم أصلاً)
        return {
            status: 'error',
            code: ApiErrorCode.INTERNAL_SERVER_ERROR, // أو كود مخصص NETWORK_ERROR
            message: error instanceof Error ? error.message : 'Unknown client error',
        };
    }

    // تحويل أرقام الحالة إلى أكواد بزنس
    private mapStatusCodeToErrorCode(status: number): string {
        switch (status) {
            case 401: return ApiErrorCode.UNAUTHORIZED;
            case 403: return ApiErrorCode.FORBIDDEN;
            case 404: return ApiErrorCode.NOT_FOUND;
            case 422: return ApiErrorCode.VALIDATION_ERROR;
            case 429: return 'TOO_MANY_REQUESTS';
            case 0: return 'NETWORK_ERROR'; // خطأ انترنت
            default: return ApiErrorCode.INTERNAL_SERVER_ERROR;
        }
    }

    // --- Convenience Methods ---
    get<T>(url: string, config?: Partial<FetchHttpClientConfig>) {
        return this.fetch<T>(url, { ...config, method: 'GET' });
    }

    post<T>(url: string, data?: any, config?: Partial<FetchHttpClientConfig>) {
        return this.fetch<T>(url, { ...config, method: 'POST', body: data });
    }

    put<T>(url: string, data?: any, config?: Partial<FetchHttpClientConfig>) {
        return this.fetch<T>(url, { ...config, method: 'PUT', body: data });
    }

    delete<T>(url: string, config?: Partial<FetchHttpClientConfig>) {
        return this.fetch<T>(url, { ...config, method: 'DELETE' });
    }
}