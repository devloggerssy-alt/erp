export function getPriorPeriodRange(from: Date, to: Date): { from: Date; to: Date } {
    const durationMs = to.getTime() - from.getTime()
    const priorTo = new Date(from.getTime() - 1)
    const priorFrom = new Date(priorTo.getTime() - durationMs)
    return { from: priorFrom, to: priorTo }
}
