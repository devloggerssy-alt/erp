import { CONSTANTS } from "@/config/constants"

export function resolveMediaUrl(url: string): string {
    if (!url) return url
    if (/^(https?|blob):\/\//i.test(url)) return url

    const base = CONSTANTS.apiUrl.replace(/\/+$/, "")
    return `${base}${url.startsWith("/") ? url : `/${url}`}`
}
