export function requireResponseData<T>(data: T | undefined, message: string): T {
    if (data === undefined) {
        throw new Error(message)
    }
    return data
}
