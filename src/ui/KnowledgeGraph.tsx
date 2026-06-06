import React, { useState, useMemo } from 'react';
import { Graph, SemanticNode } from '../core/types';

const COLOR: Record<string, string> = {
  definition: 'cn', notation: 'cn', theorem: 'th', lemma: 'th', proposition: 'th',
  corollary: 'th', axiom: 'ax', proof: 'pf', example: 'ex', remark: 'rm',
};

interface Pos { x: number; y: number; w: number; }

function computeLayout(graph: Graph): { pos: Record<string, Pos>; width: number; height: number } {
  const depth = graph.depth;
  const maxD = Math.max(0, ...graph.nodes.map((n) => depth[n.id] ?? 0));
  const buckets: Record<number, SemanticNode[]> = {};
  graph.nodes.forEach((n) => { const d = depth[n.id] ?? 0; (buckets[d] = buckets[d] || []).push(n); });
  const colW = 190, rowH = 58;
  const maxRows = Math.max(1, ...Object.values(buckets).map((b) => b.length));
  const width = (maxD + 1) * colW + 60;
  const height = maxRows * rowH + 24;
  const pos: Record<string, Pos> = {};
  for (let d = 0; d <= maxD; d++) {
    const b = buckets[d] || [];
    b.forEach((n, i) => {
      const w = Math.max(56, (n.label || n.kind).length * 7 + 22);
      pos[n.id] = { x: 30 + d * colW + colW / 2, y: (height * (i + 1)) / (b.length + 1), w };
    });
  }
  return { pos, width, height };
}

export default function KnowledgeGraph({ graph }: { graph: Graph }) {
  const [hover, setHover] = useState<string | null>(null);
  const { pos, width, height } = useMemo(() => computeLayout(graph), [graph]);
  if (!graph.nodes.length) return <div className="muted" style={{ fontSize: 13 }}>No statements yet — write some on the left.</div>;
  const cycleSet = new Set(graph.cycles.flat());
  let nb: Set<string> | null = null;
  if (hover) { nb = new Set([hover]); graph.edges.forEach((e) => { if (e.from === hover) nb!.add(e.to); if (e.to === hover) nb!.add(e.from); }); }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="kg" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', maxHeight: 420 }}>
      <defs>
        <marker id="arr" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto">
          <path d="M0,0 L9,3 L0,6 Z" className="kg-arr" />
        </marker>
      </defs>
      {graph.edges.map((e, i) => {
        const a = pos[e.from], b = pos[e.to]; if (!a || !b) return null;
        const dim = nb && !(nb.has(e.from) && nb.has(e.to));
        return <line key={i} x1={a.x - a.w / 2} y1={a.y} x2={b.x + b.w / 2} y2={b.y}
          className="kg-edge" markerEnd="url(#arr)" opacity={dim ? 0.1 : 0.65} />;
      })}
      {graph.nodes.map((n) => {
        const p = pos[n.id]; if (!p) return null;
        const dim = nb && !nb.has(n.id);
        return (
          <g key={n.id} transform={`translate(${p.x},${p.y})`} opacity={dim ? 0.22 : 1}
            onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default' }}>
            <rect x={-p.w / 2} y={-15} width={p.w} height={30} rx={7}
              className={`kg-box kg-${COLOR[n.kind]} ${cycleSet.has(n.id) ? 'kg-cycle' : ''}`} />
            <text textAnchor="middle" dy="4" className="kg-label">{n.label || n.kind}</text>
          </g>
        );
      })}
    </svg>
  );
}
