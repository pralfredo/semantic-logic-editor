// graph.ts — build the dependency graph and run the standard algorithms:
// Tarjan SCCs (cycle detection), Kahn topological sort, longest-chain depth.

import { SemanticNode, Graph, Edge } from './types';

export function buildGraph(nodes: SemanticNode[]): Graph {
  const byId: Record<string, SemanticNode> = {};
  const byLabel: Record<string, SemanticNode> = {};
  nodes.forEach((n) => { byId[n.id] = n; if (n.label && !byLabel[n.label]) byLabel[n.label] = n; });

  const edges: Edge[] = [];
  nodes.forEach((n) => {
    n.deps.forEach((d) => {
      const target = byLabel[d];
      if (target && target.id !== n.id) edges.push({ from: n.id, to: target.id });
    });
  });

  const cycles = tarjanSCC(nodes, edges);
  const acyclic = cycles.length === 0;
  const order = acyclic ? topoSort(nodes, edges) : [];
  const depth = longestChain(nodes, edges, order);

  return { nodes, byId, edges, order, acyclic, cycles, depth };
}

// adjacency: dependency edges from -> to (depends on)
function adj(nodes: SemanticNode[], edges: Edge[]): Record<string, string[]> {
  const a: Record<string, string[]> = {};
  nodes.forEach((n) => (a[n.id] = []));
  edges.forEach((e) => { if (a[e.from]) a[e.from].push(e.to); });
  return a;
}

// Tarjan's strongly-connected-components; returns SCCs of size > 1 and self-loops
function tarjanSCC(nodes: SemanticNode[], edges: Edge[]): string[][] {
  const a = adj(nodes, edges);
  let index = 0;
  const idx: Record<string, number> = {}, low: Record<string, number> = {};
  const onStack: Record<string, boolean> = {}; const stack: string[] = [];
  const out: string[][] = [];
  const selfLoops = new Set(edges.filter((e) => e.from === e.to).map((e) => e.from));

  function strong(v: string) {
    idx[v] = low[v] = index++; stack.push(v); onStack[v] = true;
    (a[v] || []).forEach((w) => {
      if (idx[w] === undefined) { strong(w); low[v] = Math.min(low[v], low[w]); }
      else if (onStack[w]) { low[v] = Math.min(low[v], idx[w]); }
    });
    if (low[v] === idx[v]) {
      const comp: string[] = []; let w: string;
      do { w = stack.pop()!; onStack[w] = false; comp.push(w); } while (w !== v);
      if (comp.length > 1 || selfLoops.has(v)) out.push(comp);
    }
  }
  nodes.forEach((n) => { if (idx[n.id] === undefined) strong(n.id); });
  return out;
}

// Kahn's algorithm; dependencies appear before dependents
function topoSort(nodes: SemanticNode[], edges: Edge[]): string[] {
  // we want deps first: process a node once all its dependencies are placed
  const a = adj(nodes, edges); // from -> deps(to)
  const remaining: Record<string, number> = {};
  nodes.forEach((n) => (remaining[n.id] = (a[n.id] || []).length));
  const order: string[] = [];
  const ready = nodes.filter((n) => remaining[n.id] === 0).map((n) => n.id);
  // dependents map: to -> [from...]
  const dependents: Record<string, string[]> = {};
  nodes.forEach((n) => (dependents[n.id] = []));
  edges.forEach((e) => dependents[e.to].push(e.from));
  while (ready.length) {
    const v = ready.shift()!;
    order.push(v);
    dependents[v].forEach((f) => { if (--remaining[f] === 0) ready.push(f); });
  }
  return order.length === nodes.length ? order : order;
}

function longestChain(nodes: SemanticNode[], edges: Edge[], order: string[]): Record<string, number> {
  const a = adj(nodes, edges);
  const depth: Record<string, number> = {};
  const seq = order.length ? order : nodes.map((n) => n.id);
  seq.forEach((id) => {
    const ds = a[id] || [];
    depth[id] = ds.length ? 1 + Math.max(...ds.map((d) => depth[d] ?? 0)) : 0;
  });
  return depth;
}
