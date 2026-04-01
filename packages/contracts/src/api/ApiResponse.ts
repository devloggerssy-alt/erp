import { ApiMeta } from "./ApiMeta";

export interface ApiSuccessResponse<T = any> {
    status: "success";
    data: T;
    message: string;
    meta?: ApiMeta;
}

