// parser.ts — turn a controlled mathematical document into a semantic AST.
//
// Each block begins with a header line:
//     Kind (Label) [uses: A, B] : statement text...
//     Proof (of Result) : ...
// The body continues on following lines until the next header. "%" lines are
// comments. Dependencies are gathered from three sources:
//   1. an explicit  [uses: A, B]  annotation,
//   2. inline  @Label  references in the body,
//   3. automatically: any other node's Label occurring as a whole word.
// This is what lets prose grow a dependency graph on its own.

import { SemanticNode, NodeKind, KIND_LABEL } from './types';

const KIND_BY_WORD: Record<string, NodeKind> = (() => {
  const m: Record<string, NodeKind> = {};
  (Object.keys(KIND_LABEL) as NodeKind[]).forEach((k) => { m[KIND_LABEL[k].toLowerCase()] = k; });
  return m;
})();

const HEADER = new RegExp(
  '^\\s*(' + Object.values(KIND_LABEL).join('|') + ')\\s*' + // kind
  '\\(([^)]*)\\)\\s*' +                                       // (label / of Result)
  '(\\[[^\\]]*\\])?\\s*' +                                    // optional [uses: ...]
  ':?\\s*(.*)$',                                              // optional ": body"
  'i'
);

function slug(s: string): string {
  return s.trim().replace(/\s+/g, '-');
}

export function parseDocument(text: string): SemanticNode[] {
  const lines = text.split(/\r?\n/);
  const nodes: SemanticNode[] = [];
  let current: SemanticNode | null = null;
  const used: Record<string, number> = {};

  const push = () => { if (current) { current.body = current.body.trim(); nodes.push(current); current = null; } };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.replace(/\s+$/,'');
    if (/^\s*%/.test(line)) return; // comment
    const m = line.match(HEADER);
    if (m) {
      push();
      const kind = KIND_BY_WORD[m[1].toLowerCase()];
      let inside = m[2].trim();
      let proves: string | undefined;
      let label = inside;
      // "Proof (of Result)" or "Proof (Result)"
      if (kind === 'proof') {
        const of = inside.match(/^of\s+(.+)$/i);
        proves = of ? of[1].trim() : inside;
        label = 'proof:' + slug(proves);
      }
      let id = label || `${kind}-${idx}`;
      if (used[id] != null) { used[id]++; id = `${id}#${used[id]}`; } else used[id] = 0;
      const explicit: string[] = [];
      if (m[3]) {
        const inner = m[3].replace(/^\[|\]$/g, '');
        const mm = inner.match(/(?:uses|needs|requires|by)\s*:?\s*(.+)/i);
        const listSrc = mm ? mm[1] : inner;
        listSrc.split(/[,;]/).forEach((s) => { const t = s.trim(); if (t) explicit.push(t); });
      }
      current = {
        id, label: kind === 'proof' ? (proves || inside) : inside,
        kind, title: (kind === 'proof' ? `Proof of ${proves}` : inside) || KIND_LABEL[kind],
        body: m[4] || '', proves, deps: [], explicitDeps: explicit, line: idx + 1,
      };
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line;
    }
  });
  push();

  resolveDependencies(nodes);
  return nodes;
}

// fill in node.deps from explicit annotations, @refs, proof targets, and
// automatic whole-word label matches.
function resolveDependencies(nodes: SemanticNode[]): void {
  const labels = nodes.map((n) => n.label).filter(Boolean);
  const labelSet = new Set(labels);
  nodes.forEach((n) => {
    const deps = new Set<string>();
    // explicit
    n.explicitDeps.forEach((d) => deps.add(d));
    // @refs
    const at = n.body.match(/@([A-Za-z][\w-]*)/g) || [];
    at.forEach((r) => deps.add(r.slice(1)));
    // proof discharges its target (a dependency)
    if (n.proves) deps.add(n.proves);
    // automatic whole-word matches of other labels
    labelSet.forEach((lab) => {
      if (lab === n.label || lab.length < 2) return;
      const re = new RegExp('(^|[^\\w@])' + escapeRe(lab) + '(?![\\w])');
      if (re.test(n.body)) deps.add(lab);
    });
    deps.delete(n.label);
    n.deps = Array.from(deps);
  });
}

function escapeRe(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
