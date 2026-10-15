# Graph Report - 3-Arrival  (2026-10-13)

## Corpus Check
- Corpus is ~27,800 words - fits in a single context window. You may not need a graph.

## Summary
- 294 nodes · 790 edges · 25 communities (15 shown, 10 thin omitted)
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 190 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- p5.js fonctions internes
- p5.js moteur graphique
- p5.sound moteur audio
- Tests et adaptateur vectoriel
- p5.sound utilitaires internes
- Scene et interface
- Vehicle et steering behaviors
- p5.js interne 7
- Documentation et exigences Snake
- p5.js interne 9
- Snake et composition du corps
- p5.js interne 11
- p5.js interne 12
- Food et repositionnement
- p5.js interne 14
- p5.js interne 15
- p5.js interne 16
- Configuration JavaScript
- p5.js interne 18
- p5.js interne 19
- p5.js interne 20
- p5.js interne 21

## God Nodes (most connected - your core abstractions)
1. `a()` - 39 edges
2. `s()` - 34 edges
3. `d()` - 31 edges
4. `u()` - 29 edges
5. `T()` - 26 edges
6. `o()` - 25 edges
7. `m()` - 25 edges
8. `o()` - 24 edges
9. `p()` - 23 edges
10. `b()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `n()` --indirect_call--> `je()`  [INFERRED]
  libraries/p5.sound.min.js → libraries/p5.min.js
- `a()` --indirect_call--> `t()`  [INFERRED]
  libraries/p5.min.js → libraries/p5.sound.min.js
- `o()` --indirect_call--> `t()`  [INFERRED]
  libraries/p5.min.js → libraries/p5.sound.min.js
- `h()` --indirect_call--> `e()`  [INFERRED]
  libraries/p5.min.js → libraries/p5.sound.min.js
- `h()` --indirect_call--> `t()`  [INFERRED]
  libraries/p5.min.js → libraries/p5.sound.min.js

## Import Cycles
- None detected.

## Communities (25 total, 10 thin omitted)

### Community 0 - "p5.js fonctions internes"
Cohesion: 0.33
Nodes (43): a(), b(), c(), d(), E(), ee(), f(), w() (+35 more)

### Community 1 - "p5.js moteur graphique"
Cohesion: 0.05
Nodes (7): bt(), ge(), je(), jt(), kt(), vt(), z()

### Community 2 - "p5.sound moteur audio"
Cohesion: 0.07
Nodes (7): gt(), jt(), Kt(), Mt(), on(), sn(), vt()

### Community 3 - "Tests et adaptateur vectoriel"
Cohesion: 0.10
Nodes (10): assert, context, createTestVector(), drawnCircles, folder, fs, path, test (+2 more)

### Community 4 - "p5.sound utilitaires internes"
Cohesion: 0.11
Nodes (18): ae(), de(), dn(), e(), fe(), he(), Le(), lt() (+10 more)

### Community 5 - "Scene et interface"
Cohesion: 0.20
Nodes (15): ajouterSerpent(), basculerInterface(), couleursSerpents, creerCurseur(), creerInterface(), curseurs, dessinerFond(), draw() (+7 more)

### Community 7 - "p5.js interne 7"
Cohesion: 0.17
Nodes (15): a(), bt(), d(), en(), ge(), h(), l(), o() (+7 more)

### Community 8 - "Documentation et exigences Snake"
Cohesion: 0.17
Nodes (8): Entrée navigateur p5.js, Nourriture, croissance et énergie, Quatre réglages indépendants en direct, Exemple Snake documenté, Composition tête et anneaux Vehicle, Panneau accessible masquable requis, Réglages vitesse et force requis, Spécification du serpent

### Community 9 - "p5.js interne 9"
Cohesion: 0.22
Nodes (11): b(), Ht(), Ie(), me(), n(), Nt(), qt(), Rt() (+3 more)

### Community 11 - "p5.js interne 11"
Cohesion: 0.22
Nodes (9): be(), ct(), i(), pe(), st(), te(), ut(), ze() (+1 more)

### Community 12 - "p5.js interne 12"
Cohesion: 0.40
Nodes (6): ce(), fe(), he(), me(), pe(), ze()

### Community 14 - "p5.js interne 14"
Cohesion: 0.50
Nodes (5): ae(), ie(), ne(), oe(), ue()

### Community 15 - "p5.js interne 15"
Cohesion: 0.40
Nodes (5): cr(), ke(), or(), ur(), Xt()

### Community 16 - "p5.js interne 16"
Cohesion: 0.40
Nodes (5): er(), mr(), qt(), tr(), Wt()

### Community 17 - "Configuration JavaScript"
Cohesion: 0.50
Nodes (3): compilerOptions, target, include

## Knowledge Gaps
- **3 isolated node(s):** `Nourriture, croissance et énergie`, `Panneau accessible masquable requis`, `Entrée navigateur p5.js`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 101 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `p5.js interne 9` to `p5.js fonctions internes`, `p5.js moteur graphique`, `p5.sound moteur audio`, `p5.sound utilitaires internes`, `p5.js interne 7`, `p5.js interne 11`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `a()` (e.g. with `ae()` and `ce()`) actually correct?**
  _`a()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Nourriture, croissance et énergie`, `Panneau accessible masquable requis`, `Entrée navigateur p5.js` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `p5.js moteur graphique` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Why does `e()` connect `p5.sound utilitaires internes` to `p5.js fonctions internes`, `p5.js moteur graphique`, `p5.sound moteur audio`, `p5.js interne 7`, `p5.js interne 9`, `p5.js interne 11`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `s()` (e.g. with `c()` and `de()`) actually correct?**
  _`s()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Should `p5.sound moteur audio` be split into smaller, more focused modules?**
  _Cohesion score 0.07311827956989247 - nodes in this community are weakly interconnected._

Note : les compteurs de tokens sémantiques ne sont pas disponibles dans cette session ; les zéros affichés sont des valeurs techniques, pas une mesure.

`graphify-out/` a été écrit dans le dépôt et apparaît dans `git status` ; il peut être ignoré ou partagé selon les besoins de l’équipe.

Contrôle d’intégrité : aucune extrémité manquante ; 5 auto-relations et 103 relations regroupées entre mêmes extrémités dans le graphe non orienté. Les liens inférés entre symboles minifiés p5.js sont à vérifier avant interprétation.

