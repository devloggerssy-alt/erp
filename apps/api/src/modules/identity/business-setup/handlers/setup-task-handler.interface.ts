export interface SetupTaskHandlerResult {
    completed: boolean;
    details?: Record<string, unknown>;
}

export interface SetupTaskHandler {
    execute(tenantId: string, userId: string, payload: unknown): Promise<SetupTaskHandlerResult>;
}
