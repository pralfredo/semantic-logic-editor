# Semantic Logic Editor

*Write mathematics in structured prose; compile it into a typed semantic model, a
dependency graph, live diagnostics, and formal exports — keeping one abstract
document as the single source of truth for many concrete forms.*

**Version 3** · TypeScript · React · Vite · runs entirely in the browser, offline
Live demo: **https://pralfredo.github.io/semantic-logic-editor/**

> **Pipeline:** controlled prose → typed semantic AST → knowledge graph →
> diagnostics → formal exports (Lean 4 · LaTeX · TPTP · Graphviz · JSON · Markdown)

---

## Contents

1. [What this is](#what-this-is)
2. [The problem it addresses](#the-problem-it-addresses)
3. [A worked example](#a-worked-example)
4. [The controlled language](#the-controlled-language)
5. [The interface, section by section](#the-interface-section-by-section)
6. [Under the hood](#under-the-hood)
7. [Formal exports](#formal-exports)
8. [Engineering principles](#engineering-principles)
9. [Running locally](#running-locally)
10. [Deployment](#deployment)
11. [Verification](#verification)
12. [Extending the editor](#extending-the-editor)
13. [Limitations and honest scope](#limitations-and-honest-scope)
14. [Roadmap](#roadmap)
15. [Intellectual background](#intellectual-background)
16. [Project layout](#project-layout)
17. [License and author](#license-and-author)

---

## What this is

The Semantic Logic Editor is a single-page application for writing mathematical
documents in a lightly controlled form of English and getting back, in real time,
a structured understanding of what was written. As you type definitions, axioms,
theorems, lemmas, proofs, examples, notation, and remarks, the editor parses each
block into a typed node of an abstract syntax tree, discovers the dependencies
between statements, assembles a directed dependency graph, runs a linter that
reports structural problems, and compiles the whole document into several formal
and typeset target languages. Nothing is sent to a server; the entire pipeline,
from parsing to graph algorithms to code generation, executes in the browser.

It is built as a serious piece of software rather than a toy: the logic core is a
pure, fully typed TypeScript library with no dependency on the DOM, exercised by
its own test suite and reused by a React interface that is, in turn, deployed
automatically through continuous integration. But it is also deliberately modest
in ambition. The fragment of mathematical language it understands is small by
design, chosen so that the *entire* journey from surface prose to formal output
remains legible end to end. The goal is not to replace a proof assistant or a
document preparation system but to make visible the structure that sits between
them — and that ordinary tools throw away.

## The problem it addresses

Mathematical writing carries an enormous amount of structure that most tools
ignore. A *definition* introduces vocabulary that later statements will lean on. A
*theorem* makes a claim that someone is expected to prove. A *proof* discharges
exactly one such claim. A *lemma* is a stepping stone; a *corollary* rides on a
result just established. Threaded through all of it is a web of dependencies:
this proof uses that lemma, which in turn relies on those two definitions, one of
which is really just notation. A mathematician reading a paper reconstructs this
scaffolding effortlessly and uses it to navigate — to know what to read first,
what a result rests on, and what would break if a definition changed.

Our tools see almost none of this. LaTeX typesets the page beautifully but
understands nothing about it: to LaTeX, a theorem and a grocery list are the same
sequence of glyphs. Proof assistants such as Lean, Coq, and Isabelle understand
the structure completely — they will not let you cite a lemma you have not
proved — but they demand that the author abandon natural-language prose for a
rigid formal syntax, which is a large barrier for everyday mathematical writing,
teaching, and note-taking. Between "prose that means nothing to the machine" and
"formal syntax that means everything but reads like code" lies a wide gap, and
most working mathematics lives precisely in that gap.

This editor is a small, honest step into it. It treats a document as a
*controlled language*: close enough to ordinary mathematical English that a person
can write it fluently, but regular enough that a parser can recover its abstract
structure. From that single recovered structure it derives everything else. The
organizing principle — one abstract representation, many concrete realizations —
is the same idea that underlies logical frameworks such as LF and the MMT system,
and the abstract-versus-concrete split in Grammatical Framework. The surface
language is in the spirit of controlled natural languages such as Attempto
Controlled English. The editor does not implement any of those systems; it borrows
their central idea and shrinks it to something you can watch work in one page.

## A worked example

Consider this short document about parity, which is one of the editor's built-in
examples:

```
Notation (Even): n is even, written 2 | n.
Definition (Even): An integer n is Even if there is an integer k with n = 2k.
Definition (Odd): An integer n is Odd if there is an integer k with n = 2k + 1.
Axiom (Trichotomy): Every integer is Even or Odd, and not both.
Lemma (SumEven): If a and b are Even then a + b is Even.
Proof (of SumEven): Write a = 2k and b = 2m by Even; then a + b = 2(k + m), so it is Even.
Theorem (SquareParity) [uses: Even, Odd]: For every integer n, n is Even iff n^2 is Even.
Proof (of SquareParity): If n is Even then n = 2k and n^2 = 2(2k^2), Even. Conversely use Odd and Trichotomy.
Example (Four): 4 is Even since 4 = 2 * 2, using Even.
```

From these nine lines the editor infers a great deal. `SumEven` depends on `Even`,
because the definition's label appears in both the lemma's statement and its
proof. `SquareParity` declares `Even` and `Odd` explicitly through its `[uses: …]`
annotation, and its proof additionally pulls in `Trichotomy`. Each `Proof (of X)`
is attached to the result `X` it discharges, so the editor knows that both the
lemma and the theorem are proven, while the axiom needs no proof and the example
is illustrative. It computes a dependency-first reading order in which every
statement follows everything it relies on, builds a glossary from the two
definitions and the notation, and reports that one hundred percent of the claims
are discharged. Switching to the Lean export produces a skeleton with the
definitions, axiom, and theorems in topological order, each theorem stubbed with
`sorry` and annotated with the dependencies it should cite.

The companion "Has issues" example does the opposite on purpose: it contains a
circular dependency between two lemmas, a theorem that cites an undefined
`Subgroup`, a definition nothing ever uses, and several claims with no proof — all
of which the diagnostics panel surfaces at once, with the cycle highlighted in red
in the graph.

## The controlled language

The input format is intentionally simple. A document is a sequence of blocks; each
block begins with a header line and continues onto subsequent lines until the next
header. A line beginning with `%` is a comment and is ignored. The header form is:

```
Kind (Label) [uses: A, B] : statement text …
Proof (of Result) : proof text …
```

`Kind` is one of **Definition, Axiom, Theorem, Lemma, Proposition, Corollary,
Proof, Example, Notation, Remark**. The label in parentheses names the statement
so other statements can refer to it. The optional bracketed annotation lists
explicit dependencies; `uses`, `needs`, `requires`, and `by` are all accepted as
the keyword. Everything after the colon is the statement's body.

Dependencies are gathered three different ways, which is what lets a dependency
graph grow out of ordinary prose rather than requiring tedious manual bookkeeping:

1. **Explicit annotation.** `Theorem (T) [uses: Even, Odd]: …` declares that `T`
   depends on `Even` and `Odd`.
2. **Inline references.** Writing `@Even` anywhere in a body marks a dependency
   on `Even`, useful when you want to point at a result mid-sentence.
3. **Automatic detection.** Any other statement's label that appears as a whole
   word in a body is recorded as a dependency. Because labels are typically
   capitalized proper names, this picks up "every Even number" without misfiring
   on the ordinary English word "even."

A `Proof (of X)` is linked automatically to the result `X` it discharges, which is
how the editor knows which claims are proven and which remain open. The grammar
reference section inside the application lists every pattern with an example, so
the format is discoverable without consulting this document.

## The interface, section by section

The application is organized into ten numbered sections, reachable from a sticky
navigation bar, beneath an overview hero that shows the processing pipeline as a
visual stepper.

**01 · Editor.** A monospace text area where you author the document, with a
toolbar for loading the built-in examples and inserting statement templates.
Everything downstream recomputes as you type.

**02 · At a glance.** Three metric cards summarize the document: the number of
statements broken down by kind, the number of dependencies together with the
graph's maximum depth and whether it is acyclic, and the proportion of claims that
have been proven, shown as a progress bar with the list of open obligations called
out beneath it.

**03 · Structured outline.** The parsed model rendered as cards, one per
statement, with logical keywords and cross-references highlighted by their semantic
role rather than their surface spelling. Each card shows both what the statement
*uses* and what *uses it* — forward and reverse dependencies side by side.

**04 · Knowledge graph.** An interactive SVG of the dependency graph, laid out in
layers by depth, with edges flowing from a statement to the things it relies on.
Hovering a node isolates its neighbourhood by dimming everything else, and any
statement caught in a cycle is outlined in red.

**05 · Reading order.** The topological sort presented as a numbered list: a
suggested order in which to read or teach the material, in which every statement
appears only after everything it depends on. When the graph contains a cycle, no
such order exists, and the section says so and points to the diagnostics.

**06 · Glossary and signature.** The vocabulary the document introduces — every
definition and piece of notation — with a count of how widely each is used, which
makes it easy to spot foundational definitions and unused ones at a glance.

**07 · Diagnostics.** The linter's output, grouped by severity into errors,
warnings, and information, each with the rule that produced it and the source line.
A clean document shows an "all clear" banner.

**08 · Formal exports.** A tabbed panel that compiles the document into six target
languages, with a one-click copy button. These are described in detail below.

**09 · Grammar reference.** A compact table of the controlled-language patterns,
their meaning, and an example of each, so the format is self-documenting.

**10 · About and background.** A short explanation of the motivation and the
ideas the project builds on, with links to the primary literature.

## Under the hood

The heart of the project is `src/core`, a pure TypeScript library with no
reference to the DOM, organized into focused modules.

**`types.ts`** declares the data model: the ten `NodeKind`s, the `SemanticNode`
record (carrying an identifier, label, kind, body, the result it proves if it is a
proof, its resolved dependencies, its explicit dependencies, and its source line),
the `Diagnostic` record with a severity, and the `Graph` record bundling nodes, an
index by id, the edge list, the topological order, an acyclic flag, the detected
cycles, and a depth map.

**`parser.ts`** turns a document into an array of `SemanticNode`s. A header regular
expression recognizes the `Kind (Label) [uses: …] : body` form; bodies accumulate
across following lines; and a resolution pass merges explicit annotations, inline
`@`-references, proof targets, and automatic whole-word label matches into each
node's dependency list.

**`graph.ts`** builds the directed graph from those dependencies and runs three
classical algorithms over it. **Tarjan's strongly-connected-components** algorithm
detects cycles, returning every nontrivial component and self-loop. **Kahn's
algorithm** produces a topological order in which dependencies precede dependents.
A **longest-path computation** over that order assigns each node a depth, which the
graph view uses to place nodes in layers.

**`linter.ts`** produces typed diagnostics from eight rules: undefined references,
duplicate labels, dependency cycles, claims with no proof, proofs of nonexistent
results, unused definitions, forward references to statements defined later in the
document, and empty statements. Each rule is a small, pure inspection of the nodes
and the graph, and a summary function tallies the result by severity.

**`analysis.ts`** computes the derived views the interface presents: the reverse
dependency map (who depends on each node), the dependency-first reading order, the
glossary of definitions and notation, the formalization progress (proven claims
over total claims, with the list of unproven ones), and the per-kind counts.

**`exporters.ts`** generates the formal and typeset outputs, described next.

The React layer in `src/ui` consumes this core through pure function calls wrapped
in memoized hooks, so every keystroke recomputes only what changed. The knowledge
graph is its own component; the rest of the interface is one composed view.

## Formal exports

The same abstract document compiles to six targets. All of them are faithful
*skeletons*: the editor recovers structure, not the full formal content of a
proof, so claims are stubbed rather than verified. This is stated plainly in each
output.

- **Lean 4.** Definitions and notation become `def … : Prop := sorry`, axioms
  become `axiom … : Prop`, and the theorem family becomes
  `theorem … : True := by sorry`, all emitted in topological order inside a
  namespace, each annotated with the dependencies it should cite.
- **LaTeX.** A complete `amsthm` document with the appropriate environments,
  `\label` and `\ref` for cross-references, and `proof` blocks linked to the
  results they discharge — genuinely useful as a starting point for a write-up.
- **TPTP.** A first-order skeleton in the standard interchange format used by
  automated theorem provers, with definitions and axioms as `axiom` formulas and
  claims as `conjecture`s, each formula stubbed as `$true` and the prose carried
  as a comment.
- **Graphviz DOT.** The dependency graph as a `digraph`, with nodes coloured by
  kind, ready to render with `dot -Tsvg` for a publication-quality figure.
- **JSON.** A machine-readable serialization of the nodes, edges, topological
  order, and cycles — the natural format for any downstream tooling.
- **Markdown.** A plain outline of the document with dependencies and the reading
  order, convenient for notes or a wiki.

## Engineering principles

A few decisions shape the codebase. The **core is decoupled from the DOM**: it is a
library of pure functions over plain data, which means it can be unit-tested in
isolation, reused outside the browser, and reasoned about without React in the
picture. Every feature is a **small, composable, pure transformation** — the
parser, each graph algorithm, each linter rule, each exporter, and each analysis
view is an independent function, so adding one rarely disturbs the others. The
project is written in **strict TypeScript** and type-checks cleanly, which catches
a large class of mistakes before runtime. And the visual design uses a deliberate
**editorial type system** — Fraunces for display, Space Grotesk for body text, IBM
Plex Mono for code and labels — with a full light and dark palette, so the
interface reads like a considered document rather than a default template.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173/semantic-logic-editor/
npm run build      # type-check (tsc) + production build into dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
```

Only the display fonts are fetched from the network; everything else runs offline.

## Deployment

Deployment is handled by a GitHub Actions workflow (`.github/workflows/deploy.yml`)
that builds the project in continuous integration and publishes it to GitHub Pages
on every push to `main`. No build output is committed to the repository and there
is no branch or folder to manage by hand. To enable it once: in the repository
settings, under Pages, set the source to "GitHub Actions." After that, each push
rebuilds and redeploys automatically. The Vite `base` is set to the repository
name so that asset URLs resolve correctly under the project path; if the
repository is renamed, that value must be updated to match.

## Verification

The project type-checks cleanly under `tsc` in strict mode and builds without
warnings. The pure core is exercised by a unit suite covering the parser including
its automatic dependency resolution, Tarjan cycle detection, topological ordering,
every linter rule, and all of the exporters, and the full interface passes a
headless server-render check confirming that every section renders without error.
The deployed site is the exact output of the continuous-integration build.

## Extending the editor

The model is designed to grow by addition rather than modification:

- **A new statement kind** — extend `NodeKind` and the label map in `types.ts`;
  it then flows through the parser, linter, and every exporter.
- **A new export target** — add one entry to the `EXPORTERS` map in
  `exporters.ts`; it appears in the interface as a tab automatically.
- **A new lint rule** — append a pure function over the nodes and graph that
  returns diagnostics.
- **A new derived view** — add a function to `analysis.ts` and surface it as a
  section.

## Limitations and honest scope

It is worth being clear about what this is not. The editor recovers the
*structure* of a document — its statements, their kinds, and their dependencies —
but not the *content* of the mathematics. It does not parse the logical meaning of
a statement's body, so it cannot check that a proof is correct, that a definition
is well-formed, or that a theorem follows from its dependencies. The formal exports
are scaffolds with stubbed claims, not verified developments. The controlled
language is a small fragment, and prose that strays outside it is treated as an
opaque body. These limits are intentional: the project's value is in making the
structural layer visible and manipulable, and in demonstrating the full pipeline
from surface language to formal target in a form small enough to understand
completely.

## Roadmap

The longer aim is to make the abstract content the single source of truth for many
representations and to push the structural layer toward genuine semantics:

- a controlled-natural-language layer over statement bodies, in the Attempto
  tradition, so that prose carries computationally meaningful semantics rather than
  only references between statements;
- a round-trippable identifier scheme so that the Lean skeleton's `sorry`s become
  proof obligations that can be pulled back into the editor — a first step toward
  semi-automated formalization;
- multiple synchronized concrete syntaxes over one abstract theory, in the
  Grammatical Framework and MMT tradition, so that set-theoretic, type-theoretic,
  and natural-language presentations are all views of a single reference.

## Intellectual background

- **MMT / OMDoc** — a foundation-independent framework for formal knowledge
  management, and the clearest expression of the one-content-many-syntaxes idea:
  https://uniformal.github.io/doc/
- **Grammatical Framework** — a programming language for grammars built on the
  separation of an abstract syntax from its concrete realizations:
  https://www.grammaticalframework.org/
- **Logical frameworks** — the LF tradition of judgments-as-types:
  https://en.wikipedia.org/wiki/Logical_framework
- **Controlled natural language** — Kuhn, *A Survey and Classification of
  Controlled Natural Languages*: https://arxiv.org/abs/1507.01701 ; and the
  Attempto Controlled English project.
- **Conceptual graphs / CGIF / KIF / CLIF** — Sowa's family of interchangeable
  knowledge-representation notations.

## Project layout

```
src/
├── core/                 # pure, typed, DOM-independent
│   ├── types.ts          # SemanticNode, Diagnostic, Edge, Graph, NodeKind
│   ├── parser.ts         # block parser + three-way dependency resolution
│   ├── graph.ts          # Tarjan SCC · Kahn topological sort · longest-chain depth
│   ├── linter.ts         # eight diagnostic rules with severities
│   ├── exporters.ts      # Lean 4 · LaTeX · TPTP · Graphviz · JSON · Markdown
│   ├── analysis.ts       # dependents · reading order · glossary · progress
│   ├── examples.ts       # sample documents
│   └── index.ts          # barrel
└── ui/
    ├── App.tsx           # the ten-section workbench
    ├── KnowledgeGraph.tsx# interactive SVG dependency graph
    └── styles.css        # editorial design system + dark mode
.github/workflows/deploy.yml   # CI build + GitHub Pages
```

## License and author

Released under the MIT License; add a `LICENSE` file if distributing.

Author: Pramithas Upreti — github.com/pralfredo
