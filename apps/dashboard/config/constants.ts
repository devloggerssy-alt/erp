export const CONSTANTS = {
    apiUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000",
    getAssetUrl: (path: string) => `${CONSTANTS.apiUrl}/${path}`,
}