# Le Travail Voté

> Qui a voté quoi sur le travail ?

Domaine visé : letravailvote.fr

Site statique qui montre comment chaque groupe de l'Assemblée nationale a voté sur les lois travail, retraites et chômage depuis 2016.

## Contenu

| Fichier | Rôle |
|---|---|
| `index.html` | la page, sa structure et ses métadonnées |
| `styles.css` | toute la mise en forme (thème clair et sombre) |
| `app.js` | les vues : par sujet, concrètement, par groupe, comparer, méthode |
| `data.js` | les données de votes, générées, à ne pas modifier à la main |
| `textes.js` | les textes de présentation des lois, écrits à la main |
| `vercel.json` | configuration d'hébergement |
| `generer_pages.py` | crée une page par adresse (loi, sujet, groupe, duel) avec son titre et son aperçu de partage, plus `sitemap.xml` et `robots.txt` |
| `loi/`, `sujets/`, `groupes/`, `comparer/`, `*.html` | pages générées, à ne pas modifier à la main |

## Déployer sur Vercel

1. Créer un dépôt Git et pousser ces fichiers sur GitHub.
2. Sur vercel.com, « Add New Project », importer le dépôt.
3. Framework preset : **Other**. Build command : vide. Output directory : `.`
4. Déployer. Chaque `git push` redéploie le site automatiquement.

## Régénérer les données

Les scripts sont dans le dossier `scripts/` du projet (hors dépôt) :

- `index.py` lit les archives JSON des scrutins de l'Assemblée et produit `index_scrutins.json`
- `familles.py` relie les groupes successifs en familles politiques
- `amendements.py` et `mesures.py` contiennent la sélection éditoriale, vérifiée à la main
- `export_site.py` assemble le tout et produit `site_data.json`, qui devient `data.js`

Pour mettre à jour après de nouveaux votes : retélécharger les archives de scrutins sur data.assemblee-nationale.fr, relancer `index.py` puis `export_site.py`.

Après toute modification de `data.js`, `textes.js` ou `index.html`, régénérer les pages :

```
python3 generer_pages.py
```

Le script met aussi à jour la date « Mis à jour le » du pied de page, à partir de la date de vérification des données.

## Règles du projet

- Aucune donnée affichée sans lien vers le scrutin officiel.
- La position d'un groupe est calculée à partir des décomptes, jamais reprise de l'étiquette de l'open data, qui diverge parfois.
- Les textes passés par 49.3 n'ont pas de vote : on affiche la motion de censure, en le disant.
- Aucun vote n'est qualifié de bon ou de mauvais.
