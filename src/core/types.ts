// types.ts — the typed semantic model
// Document  ->  SemanticNode[]  ->  Graph  ->  Diagnostics + Exports

export type NodeKind =
  | 'definition'
  | 'axiom'
  | 'theorem'
  | 'lemma'
  | 'proposition'
  | 'corollary'
  | 'proof'
  | 'example'
  | 'notation'
  | 'remark';

export const KIND_LABEL: Record<NodeKind, string> = {
  definition: 'Definition',
  axiom: 'Axiom',
  theorem: 'Theorem',
  lemma: 'Lemma',
  proposition: 'Proposition',
  corollary: 'Corollary',
  proof: 'Proof',
  example: 'Example',
  notation: 'Notation',
  remark: 'Remark',
};

// kinds that assert something requiring justification
export const CLAIM_KINDS: NodeKind[] = ['theorem', 'lemma', 'proposition', 'corollary'];

export interface SemanticNode {
  id: string;          // unique identifier (== label when available)
  label: string;       // user-facing label, e.g. "Pythagoras"
  kind: NodeKind;
  title: string;       // short display title
  body: string;        // statement / prose
  proves?: string;     // for a proof: the label it discharges
  deps: string[];      // labels this node depends on (explicit + inferred)
  explicitDeps: string[];
  line: number;        // 1-based source line of the header
}

export type Severity = 'error' | 'warning' | 'info';

export interface Diagnostic {
  severity: Severity;
  rule: string;
  message: string;
  nodeId?: string;
  line?: number;
}

export interface Edge { from: string; to: string; } // "from depends on to"

export interface Graph {
  nodes: SemanticNode[];
  byId: Record<string, SemanticNode>;
  edges: Edge[];
  order: string[];               // topological order, dependencies first ([] if cyclic)
  acyclic: boolean;
  cycles: string[][];            // strongly-connected components of size > 1 (+ self loops)
  depth: Record<string, number>; // longest dependency chain ending at the node
}
