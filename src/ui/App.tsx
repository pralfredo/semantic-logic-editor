import React, { useMemo, useState } from 'react';
import {
  parseDocument, buildGraph, lint, summary,
  EXPORTERS, ExportKey, EXAMPLES, DEFAULT_DOC,
  KIND_LABEL, SemanticNode, Diagnostic,
  dependents as computeDependents, readingOrder, glossary as computeGlossary,
  formalization, kindCounts,
} from '../core/index';
import KnowledgeGraph from './KnowledgeGraph';

const KW = ['if and only if', 'for every', 'for all', 'there exists', 'such that', 'iff', 'implies', 'if', 'then', 'not', 'and', 'or'];
const SYM = ['∀', '∃', '¬', '∧', '∨', '→', '↔', '⊑', '|'];

function esc(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function highlight(text: string, labels: Set<string>): React.ReactNode[] {
  const labelList = Array.from(labels).filter((l) => l.length > 1).sort((a, b) => b.length - a.length).map(esc);
  const parts = [
    '@[A-Za-z][\\w-]*',
    labelList.length ? '\\b(?:' + labelList.join('|') + ')\\b' : null,
    '\\b(?:' + KW.map(esc).join('|') + ')\\b',
    '[' + SYM.map(esc).join('') + ']',
  ].filter(Boolean) as string[];
  const re = new RegExp('(' + parts.join('|') + ')', 'gi');
  const out: React.ReactNode[] = []; let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    let cls = 'tok-tx';
    if (tok[0] === '@') cls = 'tok-ref';
    else if (labels.has(tok)) cls = 'tok-ref';
    else if (SYM.includes(tok) || KW.includes(tok.toLowerCase())) cls = 'tok-q';
    out.push(<span key={k++} className={cls}>{tok}</span>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Badge({ kind }: { kind: string }) {
  return <span className={`kind kind-${kind}`}>{KIND_LABEL[kind as keyof typeof KIND_LABEL] || kind}</span>;
}

function Section({ id, n, title, sub, children }: { id: string; n: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="section">
      <div className="section-head">
        <span className="section-n">{n}</span>
        <div>
          <h2>{title}</h2>
          {sub && <div className="section-sub">{sub}</div>}
        </div>
      </div>
      {children}
    </section>
  );
}

const NAV: [string, string][] = [
  ['overview', 'Overview'], ['editor', 'Editor'], ['stats', 'At a glance'],
  ['outline', 'Outline'], ['graph', 'Graph'], ['order', 'Reading order'],
  ['glossary', 'Glossary'], ['diagnostics', 'Diagnostics'], ['exports', 'Exports'],
  ['grammar', 'Grammar'], ['about', 'About'],
];

const GRAMMAR: [string, string, string][] = [
  ['Definition (L): …', 'introduces vocabulary', 'Definition (Even): n is Even if n = 2k.'],
  ['Axiom (L): …', 'asserted without proof', 'Axiom (Choice): every surjection splits.'],
  ['Theorem / Lemma / Proposition / Corollary (L): …', 'a claim to be proved', 'Lemma (SumEven): the sum of evens is Even.'],
  ['Proof (of L): …', 'discharges the claim L', 'Proof (of SumEven): write a = 2k, b = 2m …'],
  ['Example / Remark / Notation (L): …', 'illustration / aside / symbol', 'Notation (Even): 2 | n.'],
  ['… [uses: A, B] …', 'explicit dependencies', 'Theorem (T) [uses: Even, Odd]: …'],
  ['@Label', 'inline reference', '… follows from @Even …'],
  ['Label (bare mention)', 'auto-detected dependency', '… every Even number …'],
  ['% comment', 'ignored line', '% TODO: tighten this bound'],
];

export default function App() {
  const [src, setSrc] = useState<string>(DEFAULT_DOC);
  const [tab, setTab] = useState<ExportKey>('lean');
  const [copied, setCopied] = useState(false);

  const nodes = useMemo<SemanticNode[]>(() => parseDocument(src), [src]);
  const graph = useMemo(() => buildGraph(nodes), [nodes]);
  const diags = useMemo<Diagnostic[]>(() => lint(nodes, graph), [nodes, graph]);
  const sum = summary(diags);
  const labels = useMemo(() => new Set(nodes.map((n) => n.label).filter(Boolean)), [nodes]);
  const exportText = useMemo(() => EXPORTERS[tab].run(nodes, graph), [tab, nodes, graph]);

  const deps = useMemo(() => computeDependents(graph), [graph]);
  const order = useMemo(() => readingOrder(graph), [graph]);
  const gloss = useMemo(() => computeGlossary(nodes), [nodes]);
  const formal = useMemo(() => formalization(nodes), [nodes]);
  const counts = useMemo(() => kindCounts(nodes), [nodes]);
  const maxDepth = Math.max(0, ...nodes.map((n) => graph.depth[n.id] ?? 0));

  function copy() {
    try { navigator.clipboard.writeText(exportText); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* */ }
  }
  function insert(snippet: string) { setSrc((s) => s + (s.endsWith('\n') || !s ? '' : '\n') + snippet + '\n'); }

  return (
    <div className="wrap">
      <header className="masthead" id="overview">
        <div className="brand">
          <div className="logo" aria-hidden>∴</div>
          <div>
            <h1>Semantic Logic Editor</h1>
            <div className="ver">v3 · typed core · runs offline</div>
          </div>
        </div>
        <p className="tag">
          Write mathematics in structured prose. It is parsed into a <b>typed semantic model</b>,
          woven into a <b>dependency graph</b>, checked by a <b>linter</b>, and compiled to
          <b> Lean 4, LaTeX, TPTP, JSON</b> and more — keeping one abstract document as the single
          source of truth for many concrete forms.
        </p>
        <div className="pipeline">
          {['Controlled prose', 'Semantic AST', 'Knowledge graph', 'Diagnostics', 'Formal exports'].map((s, i, a) => (
            <React.Fragment key={s}>
              <span className="pstep"><span className="pdot">{i + 1}</span>{s}</span>
              {i < a.length - 1 && <span className="parrow">→</span>}
            </React.Fragment>
          ))}
        </div>
      </header>

      <nav className="navbar">
        {NAV.map(([id, label]) => <a key={id} href={`#${id}`} className="navlink">{label}</a>)}
      </nav>

      <Section id="editor" n="01" title="Editor" sub="Author one statement per block. Dependencies are also picked up from @Label and from any Label mentioned in the prose; % starts a comment.">
        <div className="toolbar">
          <span className="lab">load:</span>
          {Object.keys(EXAMPLES).map((k) => <button key={k} className="btn" onClick={() => setSrc(EXAMPLES[k])}>{k}</button>)}
          <span className="sep" />
          <span className="lab">insert:</span>
          <button className="btn" onClick={() => insert('Definition (Name): A Name is …')}>definition</button>
          <button className="btn" onClick={() => insert('Theorem (Name) [uses: ]: …')}>theorem</button>
          <button className="btn" onClick={() => insert('Proof (of Name): …')}>proof</button>
        </div>
        <textarea value={src} spellCheck={false} onChange={(e) => setSrc(e.target.value)} />
      </Section>

      <Section id="stats" n="02" title="At a glance" sub="What the document commits to, and how much of it is discharged.">
        <div className="glance">
          <div className="metric">
            <div className="metric-top"><span className="metric-num">{nodes.length}</span><span className="metric-lab">statements</span></div>
            <div className="chips">{counts.map((c) => <span key={c.kind} className={`chip kind-${c.kind}`}>{c.count} {KIND_LABEL[c.kind]}</span>)}</div>
          </div>
          <div className="metric">
            <div className="metric-top"><span className="metric-num">{graph.edges.length}</span><span className="metric-lab">dependencies</span></div>
            <div className="chips">
              <span className="chip">depth {maxDepth}</span>
              <span className={`chip ${graph.acyclic ? 'ok' : 'bad'}`}>{graph.acyclic ? 'acyclic ✓' : 'has a cycle ✗'}</span>
            </div>
          </div>
          <div className="metric">
            <div className="metric-top"><span className="metric-num">{Math.round(formal.ratio * 100)}%</span><span className="metric-lab">claims proven</span></div>
            <div className="progress"><div className="progress-fill" style={{ width: `${Math.round(formal.ratio * 100)}%` }} /></div>
            <div className="chips"><span className="chip">{formal.proven}/{formal.claims} proved</span><span className="chip kind-axiom">{formal.axioms} axioms</span></div>
          </div>
        </div>
        {formal.unproven.length > 0 && (
          <div className="callout">
            <b>Open obligations:</b> {formal.unproven.map((n) => <span key={n.id} className="dep">{n.label}</span>)}
          </div>
        )}
      </Section>

      <Section id="outline" n="03" title="Structured outline" sub="The parsed model — logical keywords and cross-references highlighted, with what each statement uses and what uses it.">
        {!nodes.length && <div className="muted">Nothing parsed yet.</div>}
        {nodes.map((n) => (
          <div className="node" key={n.id}>
            <div className="node-head">
              <Badge kind={n.kind} />
              <span className="node-title">{n.proves ? <>of <span className="tok-ref">{n.proves}</span></> : n.label}</span>
              <span className="node-line">ln {n.line}</span>
            </div>
            {n.body && <div className="node-body">{highlight(n.body, labels)}</div>}
            <div className="node-rel">
              {n.deps.length > 0 && <span className="rel"><span className="rel-lab">uses</span>{n.deps.map((d) => <span key={d} className={'dep' + (labels.has(d) ? '' : ' missing')}>{d}</span>)}</span>}
              {deps[n.id] && deps[n.id].length > 0 && <span className="rel"><span className="rel-lab">used by</span>{deps[n.id].map((id) => <span key={id} className="dep alt">{graph.byId[id]?.label || id}</span>)}</span>}
            </div>
          </div>
        ))}
      </Section>

      <Section id="graph" n="04" title="Knowledge graph" sub="Dependencies flow right to left (a statement points to what it relies on). Hover to isolate a neighbourhood; red marks a cycle.">
        <KnowledgeGraph graph={graph} />
        <div className="legend">
          <span><i className="sw cn" />definition / notation</span>
          <span><i className="sw th" />theorem family</span>
          <span><i className="sw ax" />axiom</span>
          <span><i className="sw pf" />proof</span>
          <span><i className="sw ex" />example</span>
        </div>
      </Section>

      <Section id="order" n="05" title="Reading order" sub="A dependency-first ordering (topological sort): every statement appears after everything it relies on — a suggested order to read or teach the material.">
        {graph.acyclic ? (
          <ol className="order">
            {order.map((n) => (
              <li key={n.id}><Badge kind={n.kind} /> <span className="order-label">{n.label || n.kind}</span>
                {n.deps.length > 0 && <span className="order-deps">depends on {n.deps.join(', ')}</span>}
              </li>
            ))}
          </ol>
        ) : (
          <div className="callout bad-callout">A topological order does not exist while the graph contains a cycle. Resolve the cycle reported in Diagnostics first.</div>
        )}
      </Section>

      <Section id="glossary" n="06" title="Glossary & signature" sub="The vocabulary the document introduces — every definition and piece of notation, with how widely each is used.">
        {gloss.length === 0 && <div className="muted">No definitions or notation yet.</div>}
        <div className="glossary">
          {gloss.map((n) => (
            <div className="gloss-item" key={n.id}>
              <div className="gloss-term"><Badge kind={n.kind} /> <b>{n.label}</b> <span className="gloss-used">used by {deps[n.id]?.length ?? 0}</span></div>
              <div className="gloss-body">{highlight(n.body, labels)}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="diagnostics" n="07" title="Diagnostics" sub="A linter over the model and graph: undefined references, cycles, missing or orphan proofs, unused definitions, forward references, and more.">
        <div className="diag-sum">
          <span className="badge b-no">{sum.error} errors</span>
          <span className="badge b-warn">{sum.warning} warnings</span>
          <span className="badge b-info">{sum.info} info</span>
        </div>
        {!diags.length && <div className="ok-banner">No issues — the document is well-formed.</div>}
        {diags.map((d, i) => (
          <div className={`diag ${d.severity}`} key={i}>
            <span className="diag-rule">{d.rule}</span>
            <span className="diag-msg">{d.message}{d.line ? <span className="muted"> (line {d.line})</span> : null}</span>
          </div>
        ))}
      </Section>

      <Section id="exports" n="08" title="Formal exports" sub="The same abstract document, compiled into a proof assistant, a typesetter, an automated-prover format, a graph language, and data.">
        <div className="tabs">
          {(Object.keys(EXPORTERS) as ExportKey[]).map((k) => (
            <button key={k} className={'btn' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>{EXPORTERS[k].label}</button>
          ))}
          <button className="btn primary copy" onClick={copy}>{copied ? 'copied ✓' : 'copy'}</button>
        </div>
        <pre className="code"><code>{exportText}</code></pre>
      </Section>

      <Section id="grammar" n="09" title="Grammar reference" sub="The controlled-language fragment, at a glance.">
        <table className="gram">
          <thead><tr><th>Pattern</th><th>Meaning</th><th>Example</th></tr></thead>
          <tbody>
            {GRAMMAR.map(([p, m, e]) => (
              <tr key={p}><td><code>{p}</code></td><td>{m}</td><td className="gram-ex">{e}</td></tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section id="about" n="10" title="About & background" sub="Why this exists, and the ideas it builds on.">
        <p className="prose">
          Mathematical writing carries structure that ordinary documents discard: a definition
          introduces vocabulary, a theorem makes a claim, a proof discharges it, and dependencies
          tie them together. LaTeX typesets this but understands none of it; proof assistants
          understand it fully but demand formal syntax. This editor sits in the gap — treating a
          document as a <i>controlled language</i> regular enough to parse into a typed abstract
          syntax, then deriving graph, diagnostics, and formal exports from that single source.
        </p>
        <p className="prose">
          The design separates <b>abstract content</b> from its <b>concrete syntaxes</b> — the
          organizing idea behind logical frameworks (LF / MMT) and Grammatical Framework — and uses
          a controlled-natural-language surface in the spirit of Attempto Controlled English. It is
          a demonstrator: the fragment is deliberately small so the whole pipeline stays visible.
        </p>
        <ul className="refs">
          <li><b>MMT / OMDoc</b> — foundation-independent formal knowledge — <a href="https://uniformal.github.io/doc/">uniformal.github.io/doc</a></li>
          <li><b>Grammatical Framework</b> — abstract vs. concrete syntax — <a href="https://www.grammaticalframework.org/">grammaticalframework.org</a></li>
          <li><b>Logical frameworks</b> (LF; judgments-as-types) — <a href="https://en.wikipedia.org/wiki/Logical_framework">overview</a></li>
          <li><b>Controlled natural language</b> — Kuhn, <a href="https://arxiv.org/abs/1507.01701">a survey & classification</a>; Attempto Controlled English</li>
          <li><b>Conceptual graphs / CGIF / KIF / CLIF</b> — Sowa's interchangeable KR notations</li>
        </ul>
      </Section>

      <footer className="foot">Semantic Logic Editor · TypeScript core · React UI · everything runs in your browser, offline</footer>
    </div>
  );
}
