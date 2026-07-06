import { rollUpBalances, type BalanceNode } from './roll-up-balances';

describe('rollUpBalances', () => {
  it('rolls descendants up into ancestors', () => {
    const nodes: BalanceNode[] = [
      { id: 'root', parentId: null, ownBalance: 0 },
      { id: 'a', parentId: 'root', ownBalance: 100 },
      { id: 'b', parentId: 'root', ownBalance: 50 },
      { id: 'a1', parentId: 'a', ownBalance: 25 },
    ];
    const rolled = rollUpBalances(nodes);
    expect(rolled.get('a1')).toBe(25);
    expect(rolled.get('a')).toBe(125);
    expect(rolled.get('b')).toBe(50);
    expect(rolled.get('root')).toBe(175);
  });

  it('treats an orphan parentId as a root (no crash)', () => {
    const rolled = rollUpBalances([{ id: 'x', parentId: 'ghost', ownBalance: 10 }]);
    expect(rolled.get('x')).toBe(10);
  });

  it('is cycle-safe', () => {
    const nodes: BalanceNode[] = [
      { id: 'p', parentId: 'q', ownBalance: 1 },
      { id: 'q', parentId: 'p', ownBalance: 2 },
    ];
    const rolled = rollUpBalances(nodes);
    expect(rolled.get('p')).toBeGreaterThanOrEqual(1);
    expect(rolled.get('q')).toBeGreaterThanOrEqual(2);
  });
});
