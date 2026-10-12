# Architecture des exemples de steering behaviors

Lire ce document avant toute implémentation, avec [AGENTS.md](AGENTS.md). Il décrit les frontières à respecter pour conserver le code pédagogique fourni tout en ajoutant de nouvelles entités et de nouveaux comportements.

## Référence et modèle

Le modèle suit Craig W. Reynolds, *Steering Behaviors for Autonomous Characters* (GDC 1999), disponible dans [ARTICLE_CRAIG_REYNOLDS](ARTICLE_CRAIG_REYNOLDS/Steering%20Behaviors%20For%20Autonomous%20Characters.pdf). La hiérarchie des trois niveaux est présentée page 2 du PDF ; le véhicule simple pages 4–7 ; les comportements et leur composition dans les sections suivantes, notamment pages 16–17 pour la combinaison.

```text
Objectif et perception (sélection d'action)
                  |
                  v
Sous-classe : calcul et composition des forces (steering)
                  |
                  v
Vehicle.applyForce() puis Vehicle.update() (locomotion fournie)
                  |
                  v
Règles de scène explicites, puis rendu
```

Le steering choisit comment modifier la vitesse ; il ne remplace pas la locomotion par une trajectoire codée à la main. Les téléportations de réapparition, lorsqu'elles sont demandées, sont des événements de scène distincts.

## 1. Base protégée : tous les `vehicle.js`

Chaque exemple possède sa propre classe `Vehicle`. Ces variantes contiennent du code fourni, des comportements et parfois d'autres classes. Leurs signatures, paramètres et détails d'intégration ne sont pas nécessairement identiques.

**Ne jamais modifier un `vehicle.js` sans accord explicite préalable de l'utilisateur pour le changement envisagé.** La règle s'applique au fichier entier, même pour une correction apparemment évidente, une classe `Target` placée en fin de fichier ou un simple reformatage. Ne pas déplacer son contenu vers un autre fichier pour contourner la protection.

Si une évolution semble nécessiter de toucher à la base : chercher d'abord une extension par héritage, puis, si cela reste indispensable, expliquer précisément le changement et attendre l'accord. Les modifications déjà présentes de l'utilisateur restent à préserver.

## 2. Extensions : sous-classes dans des fichiers dédiés

Tout nouveau comportement ou toute spécialisation de comportement appartient à une sous-classe du `Vehicle` de l'exemple concerné. Une nouvelle entité autonome possède son propre fichier :

```text
exemple/
  index.html        # scripts chargés dans l'ordre des dépendances
  libraries/        # p5.js et bibliothèques existantes
  vehicle.js        # base fournie, protégée
  enemy.js          # class Enemy extends Vehicle
  missile.js        # class Missile extends Vehicle
  obstacle.js       # class Obstacle extends Vehicle si l'exercice en ajoute
  sketch.js         # création, entrées, boucle de scène
  style.css         # présentation
  tests/            # tests des fonctionnalités ajoutées
  README.md         # paramètres, lancement et validation
```

Cet arbre est une convention pour les évolutions futures, pas une liste de fichiers déjà présents. Ne pas créer les entités qui ne sont pas nécessaires à la demande.

- Appeler `super(...)` dans le constructeur et garder `pos`, `vel`, `acc`, `maxSpeed` et `maxForce` compatibles avec la base locale.
- Réutiliser les comportements existants avec `super.seek(...)`, par exemple, si leur contrat convient. Pour une variante, surcharger la méthode dans la sous-classe et conserver le fichier de base intact.
- Surcharger `applyBehaviors()` pour sélectionner ou composer les forces lorsque cette méthode convient à l'API locale ; sinon ajouter une méthode dédiée dans la sous-classe.
- Passer le bon type : une méthode `seek(position)` reçoit un `p5.Vector`, tandis qu'un comportement prédictif peut recevoir une entité avec `pos` et `vel`. Documenter le contrat au lieu de supposer que toutes les méthodes acceptent les deux.
- Les fonctions utilitaires pures peuvent aider au calcul, mais la nouvelle capacité de steering reste exposée et intégrée par la sous-classe.
- Ne pas recopier la base ou redéfinir son prototype. Ne pas créer une seconde méthode du même nom dans une classe : la dernière masquerait la première.

Les obstacles représentés comme entités de la simulation suivent la même organisation ; une sous-classe immobile n'a pas à appeler `update()`. Les contrôles HTML, le fond et les services audio peuvent être de simples fonctions ou services, sans héritage de `Vehicle`.

## 3. Forces et locomotion

Pour un seek classique :

```text
direction = targetPosition - position
desiredVelocity = direction normalisée * maxSpeed
steering = desiredVelocity - velocity
force = steering limitée à maxForce
```

Définir explicitement le cas `direction = 0`, puis tester le résultat voulu. Un vecteur nul de force ne signifie pas que la vitesse existante s'annule instantanément.

Une nouvelle sous-classe calcule les composantes de steering, les pondère ou les sélectionne, limite la force résultante, puis appelle `applyForce()`. La scène ou la sous-classe appelle ensuite la mise à jour héritée **une seule fois par pas**. Une surcharge d'`update()` pour ajouter un état propre doit déléguer à `super.update()` une seule fois, sans réimplémenter l'intégration.

Ne pas changer les unités du mouvement sans conception explicite : conserver le modèle par image de la base existante. Ajouter `deltaTime` à un seul niveau produirait un modèle incohérent. La méthode `edges()` ne doit être appelée que conformément à la règle de bord choisie ; vérifier si elle est déjà appelée par l'implémentation locale.

## 4. Scène, rendu et ressources

`sketch.js` reste le contrôleur de l'exemple : initialisation dans `setup()`, collecte des entrées, choix des cibles, mise à jour de la population et orchestration de `draw()`. Il ne doit pas accumuler les nouvelles classes d'entités ni leurs formules de steering.

Pour chaque pas, actualiser les entrées et cibles selon un ordre documenté, calculer/appliquer les forces, intégrer une seule fois, traiter les règles de scène et dessiner. Si l'ordre d'actualisation des voisins influence les résultats, utiliser un instantané cohérent de leurs états pour le calcul collectif.

Les nouvelles méthodes de dessin isolent leurs styles et transformations par `push()` / `pop()`. Elles ne changent pas les forces ou positions. Un rendu de diagnostic peut lire les forces et rayons déjà calculés, sans réexécuter un comportement aléatoire.

Initialiser contrôles et écouteurs une seule fois. Garder des références pour nettoyer les timers, écouteurs ou nœuds audio ajoutés. Ne pas modifier le code historique hors périmètre pour le rendre conforme rétroactivement à ces conventions.

## 5. Chargement et autonomie des exemples

Pour des scripts classiques, charger p5.js, `vehicle.js`, les sous-classes et aides nécessaires, puis `sketch.js`. Lire les classes déjà déclarées avant d'ajouter un nouveau nom : dans `3-Arrival` et `3-Arrival_correction`, `Target` est déjà déclarée dans `vehicle.js`.

Conserver l'autonomie de chaque sous-dossier et sa version de p5.js. Une classe d'un exemple ne doit pas dépendre implicitement d'un autre dossier ni imposer une refonte des bases existantes. Ne pas convertir en modules ou en mode instance sans besoin lié à la demande et vérification du chargement.

## 6. Tests et condition de livraison

Chaque fonctionnalité ajoutée comporte des tests unitaires dans l'exemple concerné. Respecter les exigences de [AGENTS.md](AGENTS.md) : vraies méthodes testées, aléatoire reproductible, limites de force/vitesse, cas géométriques et composition selon le changement.

Séparer les tests mathématiques et d'état des vérifications navigateur. Un adaptateur vectoriel en test n'est pas la bibliothèque p5 réelle ; les interactions, le rendu et l'audio nécessitent une validation d'intégration adaptée. Tester les conséquences observables, pas seulement les libellés ou les appels de méthodes.

À l'état initial du dépôt, il n'existe pas de lanceur global configuré. En ajouter un léger avec la première fonctionnalité qui en a besoin et documenter la commande réellement exécutable. Ne pas annoncer qu'une suite a réussi si elle n'existe pas ou n'a pas été exécutée.

**Tous les tests de validation concernés doivent passer avant de proposer à l'utilisateur de faire un essai.** En cas d'échec ou de blocage, corriger ou expliquer précisément la limite ; ne pas présenter la fonctionnalité comme terminée et validée. Confirmer aussi que les fichiers `vehicle.js` n'ont pas été altérés par le travail de l'agent, sauf autorisation spécifique.

## Sources p5.js

Les références officielles et les conventions de codage applicables sont regroupées dans [AGENTS.md](AGENTS.md#références-p5js-consultées), notamment le [guide de style des exemples](https://p5js.org/contribute/documentation_style_guide/). Leur usage ne remplace ni les contrats des bases locales ni les exigences pédagogiques de ce dépôt.
