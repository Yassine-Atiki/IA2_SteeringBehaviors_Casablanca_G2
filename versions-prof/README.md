# Versions du professeur

Ces copies proviennent du commit `62cca18` du depot du professeur.
Elles conservent integralement ses versions de `1-Seek`, `3-Arrival` et `4-Wander`,
qui avaient evolue en parallele de vos personnalisations.

Vos versions personnelles restent dans les dossiers du meme nom a la racine.
Les autres exercices du cours ont ete integres directement a la racine.

Ouvrir le fichier `index.html` de chaque exemple via un serveur HTTP local.
Ces copies sont un instantane ; elles ne sont pas mises a jour automatiquement par Git.

## Validation de la fusion

Les dossiers personnels `1-Seek`, `3-Arrival` et `4-Wander` sont identiques
au commit de sauvegarde `315120e`, fichiers supprimes compris.
La branche `sauvegarde/avant-fusion-prof` conserve cet etat avant fusion.

La suite `tests/vehicle-flee.test.cjs` vise les copies du professeur pour ces
trois exercices et les fichiers integres a la racine pour les autres.
Son adaptateur vectoriel inclut les operations `sub` et `mult` utilisees par Wander.
Un echec reste present dans la version originale du professeur de `4-Wander` :
`flee` inverse `seek`, ce qui inverse aussi la correction de vitesse.
Le test attend une composante verticale negative, alors que cette methode
renvoie une composante positive. Le code du cours est conserve sans correction.

Commande PowerShell pour les tests unitaires (hors tests navigateur) :

```powershell
$testFiles = @(rg --files -g '*.test.cjs' -g '*.test.mjs' | Where-Object { $_ -notmatch 'browser\.test\.cjs$' })
node --test @testFiles
```
