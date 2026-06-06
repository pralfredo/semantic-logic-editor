// linter.ts — diagnostics over the semantic model + graph.
// Rules: undefined-ref, duplicate-label, dependency-cycle, missing-proof,
// orphan-proof, unused-definition, forward-reference, empty.

import { SemanticNode, Graph, Diagnostic, CLAIM_KINDS } from './types';

export function lint(nodes: SemanticNode[], graph: Graph): Diagnostic[] {
  const out: Diagnostic[] = [];
  const byLabel: Record<string, SemanticNode[]> = {};
  nodes.forEach((n) => { if (n.label) (byLabel[n.label] = byLabel[n.label] || []).push(n); });
  const labelSet = new Set(nodes.map((n) => n.label).filter(Boolean));
  const lineOf: Record<string, number> = {};
  nodes.forEach((n) => (lineOf[n.label] = n.line));

  // duplicate labels
  Object.keys(byLabel).forEach((lab) => {
    if (byLabel[lab].length > 1)
      out.push({ severity: 'error', rule: 'duplicate-label', message: `Label "${lab}" is defined ${byLabel[lab].length} times.`, line: byLabel[lab][1].line });
  });

  // undefined references + forward references
  nodes.forEach((n) => {
    const declared = new Set([...n.explicitDeps, ...(n.body.match(/@([A-Za-z][\w-]*)/g) || []).map((s) => s.slice(1))]);
    if (n.proves) declared.add(n.proves);
    declared.forEach((d) => {
      if (!labelSet.has(d)) out.push({ severity: 'error', rule: 'undefined-ref', message: `${n.title} references "${d}", which is not defined.`, nodeId: n.id, line: n.line });
      else if (lineOf[d] > n.line && n.kind !== 'proof') out.push({ severity: 'warning', rule: 'forward-reference', message: `${n.title} uses "${d}", which is defined later in the document.`, nodeId: n.id, line: n.line });
    });
  });

  // dependency cycles
  graph.cycles.forEach((c) => {
    const names = c.map((id) => graph.byId[id]?.label || id);
    out.push({ severity: 'error', rule: 'dependency-cycle', message: `Circular dependency: ${names.join(' → ')} → ${names[0]}.` });
  });

  // claims without a proof (and not axioms)
  const proofTargets = new Set(nodes.filter((n) => n.kind === 'proof' && n.proves).map((n) => n.proves!));
  nodes.forEach((n) => {
    if (CLAIM_KINDS.includes(n.kind) && !proofTargets.has(n.label))
      out.push({ severity: 'warning', rule: 'missing-proof', message: `${n.title} has no proof. Add  Proof (of ${n.label}): …  or mark it as an Axiom.`, nodeId: n.id, line: n.line });
  });

  // orphan proofs (prove something that doesn't exist)
  nodes.forEach((n) => {
    if (n.kind === 'proof' && n.proves && !labelSet.has(n.proves))
      out.push({ severity: 'error', rule: 'orphan-proof', message: `This proof discharges "${n.proves}", which is not stated anywhere.`, nodeId: n.id, line: n.line });
  });

  // unused definitions / notations
  const usedAsDep = new Set<string>();
  graph.edges.forEach((e) => usedAsDep.add(e.to));
  nodes.forEach((n) => {
    if ((n.kind === 'definition' || n.kind === 'notation') && !usedAsDep.has(n.id))
      out.push({ severity: 'info', rule: 'unused-definition', message: `${n.title} is never used by another statement.`, nodeId: n.id, line: n.line });
  });

  // empty statements
  nodes.forEach((n) => {
    if (!n.label) out.push({ severity: 'warning', rule: 'empty', message: `A ${n.kind} on line ${n.line} has no label.`, line: n.line });
    if (!n.body && n.kind !== 'notation') out.push({ severity: 'info', rule: 'empty', message: `${n.title} has an empty body.`, nodeId: n.id, line: n.line });
  });

  return out;
}

export function summary(diags: Diagnostic[]) {
  return {
    error: diags.filter((d) => d.severity === 'error').length,
    warning: diags.filter((d) => d.severity === 'warning').length,
    info: diags.filter((d) => d.severity === 'info').length,
  };
}
