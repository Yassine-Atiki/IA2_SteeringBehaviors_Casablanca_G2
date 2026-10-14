# Consignes pour les agents IA

Ces règles s'appliquent à tout le dépôt `SteeringBehavioursM2IA2_2026_2027_G2`. L'objectif est de développer des exemples pédagogiques autonomes de steering behaviors en JavaScript et p5.js, faciles à comprendre, à étendre et à tester.

## Avant de développer

1. Lire intégralement ce fichier et [ARCHITECTURE.md](ARCHITECTURE.md), puis les éventuelles consignes du sous-dossier concerné.
2. Examiner `git status`, les scripts chargés par `index.html`, le `vehicle.js` local et les tests existants. Préserver les modifications de l'utilisateur et les autres exercices.
3. Consulter les sections pertinentes de Craig W. Reynolds, *Steering Behaviors for Autonomous Characters* (GDC 1999), dans [le PDF fourni](ARTICLE_CRAIG_REYNOLDS/Steering%20Behaviors%20For%20Autonomous%20Characters.pdf). La [version publiée par l'auteur](https://www.red3d.com/cwr/steer/gdc99/) permet aussi de consulter les illustrations.
4. Identifier le comportement demandé, ses paramètres, les unités et les critères d'acceptation avant de coder. Ne pas ajouter de fonctionnalités étrangères à l'exercice.

## Règle impérative : protéger les fichiers `vehicle.js`

**Ne modifier aucun fichier `vehicle.js` sans confirmation explicite préalable de l'utilisateur pour la modification concernée.** Cette protection couvre tout le fichier, y compris les autres classes qu'il peut contenir, ses commentaires, sa mise en forme et ses exemples incomplets.

- Ne pas corriger, reformater, renommer, déplacer, supprimer ou remplacer silencieusement un `vehicle.js` ; ne pas utiliser de monkey patch de son prototype pour contourner cette règle.
- Une demande générale de fonctionnalité ne constitue pas une autorisation de modifier la base. Si l'utilisateur a déjà autorisé précisément la modification concernée, ne pas redemander la même confirmation.
- Ajouter ou spécialiser les comportements **dans des sous-classes de la classe `Vehicle` locale**, dans de nouveaux fichiers. Réutiliser les méthodes existantes via l'héritage et `super` lorsqu'elles conviennent ; ne pas copier intégralement la classe de base.
- Si la base contient une limitation ou un comportement incomplet, le signaler et implémenter la variante dans une sous-classe. Si une modification de la base est réellement indispensable, expliquer le fichier et le changement nécessaires, puis attendre la confirmation avant de toucher à ce fichier. Continuer les parties indépendantes du travail.
- Avant livraison, vérifier que les fichiers protégés n'ont pas été modifiés par le travail de l'agent. Si l'utilisateur avait déjà des modifications, les conserver telles quelles : ne pas les restaurer depuis Git.

## Règle impérative : toute entité graphique mobile est un Vehicle

Tout objet visible qui peut se déplacer dans la simulation doit être une instance de
`Vehicle` ou d'une sous-classe de `Vehicle`. Il utilise la locomotion héritée
(`applyForce()`, `update()`, `edges()`) et un steering behavior pour diriger son
mouvement. Une cible mobile n'est jamais un simple objet de coordonnées déplacé
directement par la scène.

- Une cible spécialisée étend la classe `Target` locale, qui elle-même étend
  `Vehicle`, dans un fichier dédié portant le nom de l'entité, par exemple
  `targetFuyante.js` pour `TargetFuyante`.
- La sous-classe réutilise ou surcharge les comportements de `Vehicle` et appelle
  `super.update()` une seule fois ; elle ne recopie pas l'intégration de position et
  de vitesse dans `sketch.js`.
- Les forces de fuite, poursuite ou évitement sont calculées comme des steering
  behaviors. Les positions ne sont pas téléportées pour simuler un déplacement, sauf
  pour une règle de scène explicitement documentée comme une réapparition.
- Les éléments immobiles de l'interface et le décor peuvent rester du HTML ou du
  rendu p5.js. Cette exception ne s'applique pas à une entité qui se déplace dans le
  monde simulé.

## Steering selon Reynolds

Respecter trois responsabilités : **sélection d'action** (choisir l'objectif), **steering** (calculer une force) et **locomotion** (appliquer la force et intégrer le mouvement).

- Utiliser `p5.Vector` pour positions, vitesses, accélérations et forces. Un comportement retourne une force et ne téléporte pas l'entité.
- Pour `seek`, la direction est `targetPosition - position`, la vitesse désirée est orientée vers la cible, et `steering = desiredVelocity - currentVelocity`. Limiter la force selon `maxForce`.
- Appliquer les forces avec `applyForce()` et réutiliser la locomotion fournie. Ne pas intégrer position/vitesse une deuxième fois dans la sous-classe ou dans `sketch.js`.
- Pour un nouveau `flee`, construire une vitesse désirée orientée à l'opposé de la cible, puis soustraire la vitesse courante. Inverser une force `seek` déjà calculée n'est pas en général équivalent lorsque le véhicule se déplace.
- Distinguer `seek` d'`arrive` : ralentir progressivement dans une zone définie pour une arrivée, avec seuil d'arrêt documenté et gestion de la vitesse résiduelle.
- Pour `pursue` et `evade`, prédire une position future avec la vitesse de la cible et un horizon borné. Gérer une vitesse nulle sans division par zéro.
- Pour `wander`, conserver un état de direction perturbé progressivement ; ne pas tirer une destination indépendante à chaque image.
- Séparer séparation, alignement et cohésion pour le flocking. Exclure l'entité elle-même du voisinage et gérer voisins absents ou superposés.
- Documenter perception, rayons, distances de freinage, horizon de prédiction, poids et priorités. Les paramètres doivent avoir un sens pour l'exemple.
- Composer explicitement les forces dans la sous-classe : somme pondérée ou priorités selon le besoin. Limiter la force finale après pondération, avant application, pour ne pas dépasser le budget prévu. Une somme pondérée peut annuler des forces opposées ; tester les cas où une priorité d'évitement est nécessaire.
- Préserver les vecteurs de la cible et des voisins : utiliser des copies ou les opérations statiques appropriées. Éviter les valeurs non finies, les normalisations indéfinies et les boucles de recherche aléatoire non bornées.
- Les réapparitions, collisions, conditions de bord et cycles de vie sont des règles explicites de scène ; elles restent distinctes des comportements de direction. Ne pas supposer qu'un rebouclage visuel rend automatiquement le steering torique.

## Organisation du code

- Une nouvelle entité autonome = une sous-classe = un fichier : par exemple `Enemy` dans `enemy.js`, `Missile` dans `missile.js`, `Obstacle` dans `obstacle.js`. Ne pas regrouper ces nouvelles classes dans `vehicle.js` ou `sketch.js`.
- Une entité représentée par un véhicule mais immobile, telle qu'un obstacle, peut étendre `Vehicle` sans appeler sa locomotion. L'interface et les éléments décoratifs ne sont pas des véhicules.
- Garder chaque exemple autonome dans son sous-dossier. Ne pas partager implicitement une base `Vehicle` avec un autre exercice : les signatures et comportements diffèrent.
- `sketch.js` initialise la scène, recueille les entrées, orchestre une mise à jour par entité et dessine. Les sous-classes portent les comportements spécialisés. Les aides mathématiques pures peuvent être séparées, sans remplacer cette extension par héritage.
- Charger p5, la base, les sous-classes puis `sketch.js` dans cet ordre. Éviter les collisions de noms avec des classes déjà déclarées, notamment `Target` dans certains `vehicle.js`.

## Bonnes pratiques JavaScript et p5.js

Les règles ci-dessous sont les conventions du dépôt, éclairées par les ressources officielles listées plus bas. Le guide de contribution à la bibliothèque p5.js n'impose pas à ces exercices son workflow GitHub.

- Écrire du code lisible pour des étudiants : noms explicites, petites méthodes, `const` par défaut et `let` pour les variables réaffectées, aucune globale implicite. Conserver le style local ; pour les nouveaux fichiers, utiliser une indentation de deux espaces.
- Initialiser canvas, contrôles, entités et écouteurs une seule fois dans `setup()` ou dans une initialisation dédiée. Utiliser le mécanisme de chargement d'assets compatible avec la version embarquée, notamment `preload()` en p5.js 1.x. Ne pas créer de DOM, de timers ou de nouvelles instances p5 à chaque `draw()`.
- Respecter le mode global déjà présent. Utiliser le mode instance si plusieurs sketches doivent cohabiter, uniquement dans le périmètre demandé ; ne pas migrer tous les exemples pour une petite fonctionnalité.
- Inspecter la version des fichiers `libraries/p5*.js` avant de choisir une API. `1-Seek` embarque initialement p5.js 1.7.0. Ne pas modifier les bibliothèques minifiées ni les mettre à jour sans nécessité et validation de compatibilité.
- Comprendre les mutations de `p5.Vector` : `.add()`, `.sub()`, `.mult()` sur une instance modifient généralement cette instance. Préférer `copy()` ou les méthodes statiques pour préserver les entrées. Ne pas transmettre un objet entité à une méthode qui attend son vecteur `pos`.
- Isoler styles et transformations de chaque nouveau rendu avec `push()` / `pop()`. Ne pas laisser `colorMode()`, `angleMode()`, `translate()` ou `rotate()` modifier involontairement les autres dessins, y compris ceux de la base protégée.
- Conserver les unités du modèle local. Les exemples fournis intègrent souvent le mouvement par image. `frameRate(60)` ne garantit pas un pas constant ; ne pas multiplier arbitrairement par `deltaTime` une force déjà intégrée par la base. Toute variante temporelle exige une conception et des tests cohérents, sans toucher à `vehicle.js` sans autorisation.
- Pour un contrôle devant réagir pendant un glissement, traiter `input`, mettre à jour le paramètre et son affichage immédiatement. Associer un libellé au contrôle, prévoir le clavier et convertir les coordonnées du pointeur dans le repère du canvas.
- Prévoir des descriptions du canvas avec `describe()` lorsque disponible, des commandes lisibles et un contraste adapté. La couleur seule ne doit pas porter une information essentielle.
- Nettoyer les écouteurs, timers et ressources créés par une nouvelle fonctionnalité. Pour l'audio, respecter l'activation par interaction utilisateur et tester que l'arrêt coupe tout le mix et libère les sources.
- Éviter les calculs ou allocations inutiles dans `draw()` ; ne pas introduire de framework, moteur physique ou chaîne de build lourde pour ces petits exemples.

## Tests obligatoires et livraison

**Chaque nouvelle fonctionnalité doit avoir des tests unitaires pertinents. Ne proposer à l'utilisateur de tester que lorsque tous les tests de validation concernés ont été exécutés et sont passés.** Une capture d'écran, un changement de libellé ou une vérification de syntaxe ne remplace pas ces tests.

1. Réutiliser le lanceur présent. S'il n'existe pas, ajouter un dispositif léger dans l'exemple, avec une commande reproductible et documentée. À l'état initial, `1-Seek/test.js` est un commentaire, pas une suite exécutable ; aucun lanceur global n'est configuré.
2. Une option sans dépendance de test supplémentaire est `node:test` avec `node:assert/strict` (Node.js 18+), dans `tests/*.test.mjs`. La commande `node --test tests/*.test.mjs`, lancée depuis l'exemple, ne devient valable qu'après création de ces fichiers et de leur chargement compatible avec le code testé.
3. Tester les vraies méthodes de la sous-classe, les méthodes de base qu'elle réutilise et leurs effets observables. Ne pas recopier l'algorithme dans les tests ni se limiter à vérifier les appels de fonctions.
4. Couvrir direction et grandeur des forces, limites `maxForce` / `maxSpeed`, composition, proximité et éloignement, cible confondue avec l'entité, vitesse nulle, seuils exacts, entrées invalides et absence de mutation des vecteurs partagés, selon la fonctionnalité.
5. Injecter un générateur aléatoire ou utiliser une graine fixe ; rendre l'horloge et les entrées contrôlables. Éviter les tests dont le succès dépend d'un délai réel imprévisible ou du hasard.
6. Pour une fonctionnalité de scène, ajouter les tests adaptés : variation d'effectif, identité conservée, collisions/rayons, bords, événements `input`, nettoyage et réinitialisations. Ne pas imposer des tests sans rapport avec le changement.
7. Pour les tests sans navigateur, utiliser si nécessaire un adaptateur minimal p5 clairement identifié. Il ne prouve pas la compatibilité avec p5 réel : compléter les changements interactifs, graphiques ou audio par une validation d'intégration dans le navigateur. Mesurer le résultat réel lorsque nécessaire, par exemple le signal audio après arrêt.
8. Exécuter toutes les suites pertinentes après la dernière modification, corriger les échecs et vérifier les régressions connues. Un test ignoré, bloqué ou non exécuté n'est pas un succès. En cas de blocage, le signaler sans présenter le travail comme validé ni transférer à l'utilisateur la responsabilité de tester.
9. Livrer les fichiers concernés, le comportement obtenu, les commandes de tests et leurs résultats, les limites restantes et la confirmation que les bases protégées n'ont pas été altérées par l'agent. Documenter les paramètres et commandes dans le README local.

Une modification exclusivement documentaire ne nécessite pas d'inventer des tests de comportement. Vérifier alors les liens, la cohérence des consignes et le diff, et indiquer qu'aucun code n'a changé.

## Références p5.js consultées

Ressources officielles vérifiées le 12 octobre 2026 ; consulter la documentation correspondant à la version réellement utilisée.

- [Documentation Style Guide](https://p5js.org/contribute/documentation_style_guide/) : guide de style pour la documentation et les exemples p5.js ; source de conventions de lisibilité, à adapter à ces exercices.
- [Contributor Guidelines](https://p5js.org/contribute/contributor_guidelines/) : principes pédagogiques, accessibilité, tests et standard de code contrôlé par ESLint pour la bibliothèque elle-même.
- [p5.Vector](https://p5js.org/reference/p5/p5.Vector/) et [push()/pop()](https://p5js.org/reference/p5/push/) : vecteurs, copies et isolation du rendu.
- [deltaTime](https://p5js.org/reference/p5/deltaTime/), [input()](https://p5js.org/reference/p5.Element/input/) et [describe()](https://p5js.org/reference/p5/describe/) : temps, interactions et description accessible du canvas.

Les règles d'héritage, de protection des bases et de validation avant essai utilisateur sont des exigences locales de ce dépôt, pas des citations du guide p5.js.

## Entités graphiques et scénarios : directives complémentaires

- Toute entité graphique du monde simulé est un `Vehicle` ou une sous-classe, même lorsqu'elle est initialement immobile (nourriture, obstacle, cible, leurre). Les boutons, curseurs, fonds et dessins de diagnostic restent de l'interface ou du rendu, pas des entités du monde.
- Tout déplacement autonome est piloté par des steering behaviors, via les forces et la locomotion héritées. Ne pas déplacer une entité en modifiant directement sa position à chaque image. Les réapparitions et les entrées directement pilotées par le pointeur sont des règles de scène distinctes et documentées.
- Une cible fuyante réutilise le comportement `flee()` hérité : appeler `super.flee(threat.pos)` lorsque le contrat le permet, puis `applyForce()`. Ne pas recoder la formule de fuite dans le contrôleur de scène.
- Pour une sélection de scénarios, préserver le comportement du scénario existant, isoler l'état de chaque scénario et afficher uniquement les paramètres pertinents. Un changement de scénario réinitialise proprement la fuite, l'endurance et les références aux menaces.
- Distinguer rayon de déclenchement et distance de sortie. Lorsqu'une menace quitte le rayon de déclenchement, continuer à mesurer sa distance réelle jusqu'au seuil de sortie ; l'absence de menace dans le premier rayon ne prouve pas que le second est atteint.
- Une fuite limitée dans le temps doit restaurer les paramètres normaux à la sortie ou à l'épuisement. Éviter qu'elle se réactive à l'image suivante et contourne sa durée maximale ; documenter la condition de réarmement.
- Le debug lit les données de perception et de comportement existantes : ne pas relancer le calcul d'une force pour dessiner. Tester les seuils exacts, le choix du prédateur le plus proche, la durée, la restauration des limites, les transitions de scénario et la synchronisation touche/case debug.
