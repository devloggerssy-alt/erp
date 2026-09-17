/** Emitted when a run finds drift that is new or larger than the previous run's. */
export class ReconciliationDriftDetectedEvent {
    static readonly NAME = 'reconciliation.drift-detected';

    constructor(
        public readonly tenantId: string,
        public readonly runId: string,
        public readonly newFindings: string[],
    ) {}
}
