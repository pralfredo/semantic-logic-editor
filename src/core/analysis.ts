// analysis.ts — derived views over the semantic model used by the UI sections.

import { SemanticNode, Graph, NodeKind, CLAIM_KINDS } from './types';

// reverse dependencies: for each node id, who depends on it
export function dependents(graph: Graph): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  graph.nodes.forEach((n) => (out[n.id] = []));
  graph.edges.forEach((e) => { if (out[e.to]) out[e.to].push(e.from); });
  return out;
}

// dependency-first reading order, as labels (falls back to document order if cyclic)
export function readingOrder(graph: Graph): SemanticNode[] {
  if (!graph.order.length) return graph.nodes;
  return graph.order.map((id) => graph.byId[id]).filter(Boolean);
}

// the vocabulary the document introduces: definitions and notation
export function glossary(nodes: SemanticNode[]): SemanticNode[] {
  return nodes.filter((n) => n.kind === 'definition' || n.kind === 'notation');
}

export interface Formalization {
  claims: number;
  proven: number;
  axioms: number;
  ratio: number; // proven / claims (1 if no claims)
  unproven: SemanticNode[];
}

// how much of the document is discharged: claims that have a matching proof
export function formalization(nodes: SemanticNode[]): Formalization {
  const proofTargets = new Set(
    nodes.filter((n) => n.kind === 'proof' && n.proves).map((n) => n.proves!)
  );
  const claimNodes = nodes.filter((n) => CLAIM_KINDS.includes(n.kind));
  const proven = claimNodes.filter((n) => proofTargets.has(n.label));
  const axioms = nodes.filter((n) => n.kind === 'axiom').length;
  return {
    claims: claimNodes.length,
    proven: proven.length,
    axioms,
    ratio: claimNodes.length ? proven.length / claimNodes.length : 1,
    unproven: claimNodes.filter((n) => !proofTargets.has(n.label)),
  };
}

// counts per kind, in a stable order
export function kindCounts(nodes: SemanticNode[]): { kind: NodeKind; count: number }[] {
  const order: NodeKind[] = ['definition', 'notation', 'axiom', 'theorem', 'lemma', 'proposition', 'corollary', 'proof', 'example', 'remark'];
  const c: Record<string, number> = {};
  nodes.forEach((n) => (c[n.kind] = (c[n.kind] || 0) + 1));
  return order.filter((k) => c[k]).map((k) => ({ kind: k, count: c[k] }));
}
