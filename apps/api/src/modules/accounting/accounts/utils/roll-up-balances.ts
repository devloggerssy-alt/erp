/** Minimal shape needed to roll balances up a parent hierarchy. */
export interface BalanceNode {
  id: string;
  parentId: string | null;
  ownBalance: number;
}

/**
 * Returns a map of accountId → rolled balance (own + sum of all descendants).
 * A parentId that points to a non-existent node is treated as a root.
 * Cycles are broken defensively so traversal always terminates.
 */
export function rollUpBalances(nodes: BalanceNode[]): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    const parentKey = n.parentId && byId.has(n.parentId) ? n.parentId : null;
    if (parentKey) {
      const list = childrenOf.get(parentKey) ?? [];
      list.push(n.id);
      childrenOf.set(parentKey, list);
    }
  }

  const rolled = new Map<string, number>();

  const compute = (id: string, path: Set<string>): number => {
    if (rolled.has(id)) return rolled.get(id)!;
    if (path.has(id)) return byId.get(id)?.ownBalance ?? 0; // cycle: own only
    path.add(id);
    const own = byId.get(id)?.ownBalance ?? 0;
    const childSum = (childrenOf.get(id) ?? []).reduce(
      (sum, childId) => sum + compute(childId, path),
      0,
    );
    path.delete(id);
    const total = own + childSum;
    rolled.set(id, total);
    return total;
  };

  for (const n of nodes) compute(n.id, new Set());
  return rolled;
}
