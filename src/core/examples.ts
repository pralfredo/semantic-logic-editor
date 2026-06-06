// examples.ts — sample documents that exercise the parser, graph, and linter.

export const EXAMPLES: Record<string, string> = {
  'Figurate numbers': [
    'Notation (Index): n ranges over the positive integers 1, 2, 3, …',
    'Definition (Triangular): The nth Triangular number is T_n = 1 + 2 + … + n = n(n+1)/2.',
    'Definition (Oblong): The nth Oblong number is O_n = n(n+1), the count of dots in an n by (n+1) rectangle.',
    'Definition (Square): The nth Square number is S_n = n^2.',
    'Lemma (OddSum) [uses: Square]: The nth Square number is the sum of the first n odd numbers: n^2 = 1 + 3 + … + (2n-1).',
    'Proof (of OddSum): Each L-shaped gnomon added to an n by n Square has 2n+1 dots, growing it to (n+1)^2; summing the gnomons from 1 gives the odd numbers.',
    'Theorem (OblongDouble) [uses: Oblong, Triangular]: Every Oblong number is twice a Triangular number: O_n = 2 T_n.',
    'Proof (of OblongDouble): By Oblong, O_n = n(n+1). By Triangular, T_n = n(n+1)/2, so 2 T_n = n(n+1) = O_n.',
    'Theorem (SquareSum) [uses: Square, Triangular]: Consecutive Triangular numbers sum to a Square: T_{n-1} + T_n = S_n.',
    'Proof (of SquareSum): T_{n-1} + T_n = (n-1)n/2 + n(n+1)/2 = n(2n)/2 = n^2, which is S_n by Square.',
    'Example (Small): T_4 = 10, O_4 = 20 = 2 * 10 by OblongDouble, and S_4 = 16 = 1 + 3 + 5 + 7 by OddSum.',
    'Remark (Gnomon): The gnomon — the L-shaped border added to grow a figure — ties OddSum and the figurate identities together.',
  ].join('\n'),

  'Parity': [
    'Notation (Even): n is even, written 2 | n.',
    'Definition (Even): An integer n is Even if there is an integer k with n = 2k.',
    'Definition (Odd): An integer n is Odd if there is an integer k with n = 2k + 1.',
    'Axiom (Trichotomy): Every integer is Even or Odd, and not both.',
    'Lemma (SumEven): If a and b are Even then a + b is Even.',
    'Proof (of SumEven): Write a = 2k and b = 2m by Even; then a + b = 2(k + m), so it is Even.',
    'Theorem (SquareParity) [uses: Even, Odd]: For every integer n, n is Even iff n^2 is Even.',
    'Proof (of SquareParity): If n is Even then n = 2k and n^2 = 2(2k^2), Even. Conversely use Odd and Trichotomy.',
    'Example (Four): 4 is Even since 4 = 2 * 2, using Even.',
  ].join('\n'),

  'Orders': [
    'Definition (Reflexive): A relation R is Reflexive if x R x for all x.',
    'Definition (Antisymmetric): R is Antisymmetric if x R y and y R x imply x = y.',
    'Definition (Transitive): R is Transitive if x R y and y R z imply x R z.',
    'Definition (PartialOrder): A PartialOrder is a relation that is Reflexive, Antisymmetric, and Transitive.',
    'Definition (Chain) [uses: PartialOrder]: A Chain is a PartialOrder in which any two elements are comparable.',
    'Theorem (Zorn) [uses: PartialOrder, Chain]: If every Chain in a PartialOrder has an upper bound, it has a maximal element.',
    'Proof (of Zorn): Standard transfinite argument (omitted).',
    'Remark (AC): Zorn is equivalent to the Axiom of Choice.',
  ].join('\n'),

  'Has issues (lint demo)': [
    'Definition (Group): A Group is a set with an associative operation, an identity, and inverses.',
    'Definition (Abelian) [uses: Group]: An Abelian group is a Group whose operation is commutative.',
    'Definition (Lonely): A definition that nothing ever uses.',
    'Theorem (Lagrange) [uses: Group, Subgroup]: The order of a Subgroup divides the order of the Group.',
    'Lemma (Spin) [uses: Wobble]: Every Wobble spins.',
    'Lemma (Wobble) [uses: Spin]: Every Spin wobbles.',
  ].join('\n'),
};

export const DEFAULT_DOC = EXAMPLES['Figurate numbers'];
