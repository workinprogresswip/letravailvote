"""Génère une page HTML par adresse du site (une par loi, par sujet, par groupe, par duel),
avec son propre titre et sa propre description pour les moteurs de recherche et les aperçus
de partage (LinkedIn, X, messageries). Toutes les pages chargent la même application.

À relancer après chaque mise à jour de data.js, textes.js ou index.html :
    python3 generer_pages.py
"""
import html
import json
import re
import unicodedata
from pathlib import Path

RACINE = Path(__file__).resolve().parent
SITE = "https://www.letravailvote.fr"
DOSSIERS = ["loi", "sujets", "groupes", "comparer"]
FICHIERS = ["sujets.html", "groupes.html", "comparer.html", "methode.html", "mentions.html"]


def lire_objet(texte, nom):
    """Extrait l'objet JSON `const NOM={...}` d'un fichier JS."""
    m = re.search(r"const " + nom + r"=(\{.*?\});", texte, re.S)
    return json.loads(m.group(1))


def slug(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def court(texte, n=200):
    if len(texte) <= n:
        return texte
    return texte[:n].rsplit(" ", 1)[0].rstrip(",;:") + "…"


data_js = (RACINE / "data.js").read_text(encoding="utf-8")
DATA = json.loads(data_js[data_js.index("{"): data_js.rindex("}") + 1])
app_js = (RACINE / "app.js").read_text(encoding="utf-8")
COURT = lire_objet(app_js, "COURT")
CATDESC = lire_objet(app_js, "CATDESC")
textes_js = (RACINE / "textes.js").read_text(encoding="utf-8")
BREF = dict(re.findall(r'^"([^"]+)":\{bref:"((?:[^"\\]|\\.)*)"', textes_js, re.M))
POURVOUS = lire_objet(textes_js, "POURVOUS")

FAMS = [f["id"] for f in DATA["familles"] if f["id"] != "Non inscrits"]
LOIS = sorted(DATA["lois"], key=lambda l: l["reference"]["date"])
VOTEES = [l for l in LOIS if l["mode"] != "493"]
VERIF = DATA["verif"]
MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]


def fmt_date(d):
    a, m, j = d.split("-")
    return f"{int(j)} {MOIS[int(m) - 1]} {a}"


def pos(l, f):
    """Position d'une famille sur une loi votée (même règle que famPos dans app.js)."""
    v = l["reference"]["f"].get(f)
    return v[4] if v else "none"


def titre_page(t):
    return f"{t} · Le Travail Voté" if t else "Le Travail Voté"


# ---------- les pages : (adresse, titre, description)
pages = [("/", "", None)]
pages.append(("/sujets", "Les votes par sujet",
              f"Retraites, chômage, code du travail, salaires : comment chaque groupe politique a voté sur les {len(VOTEES)} lois travail depuis 2016, sujet par sujet."))
for c in DATA["categories"]:
    n = sum(l["categorie"] == c for l in LOIS)
    pages.append((f"/sujets/{slug(c)}", f"{c} : qui a voté quoi",
                  court(f"{n} texte{'s' if n > 1 else ''} depuis 2016 et le vote de chaque groupe. {CATDESC.get(c, '')}")))
pages.append(("/groupes", "Les votes par groupe politique",
              "Pour chaque groupe de l'Assemblée nationale, toutes ses positions sur les lois travail, retraites et chômage depuis 2016."))
for f in FAMS:
    t = {"pour": 0, "contre": 0, "abstention": 0}
    for l in VOTEES:
        p = pos(l, f)
        if p in t:
            t[p] += 1
    n = sum(t.values())
    if not n:
        continue
    pages.append((f"/groupes/{slug(COURT[f])}", f"Comment {COURT[f]} a voté sur le travail",
                  f"{n} loi{'s' if n > 1 else ''} votée{'s' if n > 1 else ''} depuis 2016 : {t['pour']} pour, {t['contre']} contre, {t['abstention']} abstention{'s' if t['abstention'] > 1 else ''}. Chaque vote renvoie au scrutin officiel."))
pages.append(("/comparer", "Comparer deux groupes",
              "Choisissez deux groupes politiques et voyez sur quelles lois travail ils ont voté pareil, et sur lesquelles ils se sont opposés."))
for a in FAMS:
    for b in FAMS:
        if a == b:
            continue
        n = acc = 0
        for l in VOTEES:
            pa, pb = pos(l, a), pos(l, b)
            if pa in ("none", "absent") or pb in ("none", "absent"):
                continue
            n += 1
            acc += pa == pb
        desc = (f"{COURT[a]} et {COURT[b]} ont eu la même position sur {acc} des {n} lois travail où les deux groupes ont voté."
                if n else f"{COURT[a]} et {COURT[b]} n'ont jamais voté sur les mêmes lois de cette sélection.")
        pages.append((f"/comparer/{slug(COURT[a])}/{slug(COURT[b])}", f"{COURT[a]} et {COURT[b]} : leurs votes comparés", desc))
for l in LOIS:
    r = l["reference"]
    if l["mode"] == "493":
        res = "Adopté par 49.3, sans vote de l'Assemblée."
    else:
        res = f"{'Adopté' if r['sort'] == 'adopté' else 'Rejeté'} {r['pour']}-{r['contre']} le {fmt_date(r['date'])}."
    bref = BREF.get(l["id"], "")
    desc = " ".join(x for x in [f"{bref}." if bref else "", res, POURVOUS.get(l["id"], "")] if x)
    pages.append((f"/loi/{l['id']}", f"{l['titre']}, {l['annee']} : qui a voté quoi", court(desc)))
pages.append(("/methode", "Méthode",
              "D'où viennent les chiffres : données ouvertes de l'Assemblée nationale, position des groupes, cas du 49.3, familles politiques."))
pages.append(("/mentions", "Mentions légales", "Éditeur, hébergeur, données personnelles et signalement d'erreur."))


# ---------- écriture
def remplir(modele, titre, desc, adresse):
    def meta(cle, valeur, h):
        return re.sub(r'(<meta (?:name|property)="' + re.escape(cle) + r'" content=")[^"]*(")',
                      lambda m: m.group(1) + html.escape(valeur) + m.group(2), h)
    h = re.sub(r"<title>.*?</title>", lambda m: f"<title>{html.escape(titre)}</title>", modele)
    for cle in ("og:title", "twitter:title"):
        h = meta(cle, titre, h)
    if desc:
        for cle in ("description", "og:description", "twitter:description"):
            h = meta(cle, desc, h)
    h = meta("og:url", SITE + adresse, h)
    h = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + SITE + adresse + m.group(2), h)
    return h


accueil = RACINE / "index.html"
modele = accueil.read_text(encoding="utf-8")
modele = re.sub(r'(<span id="maj">)[^<]*(</span>)', lambda m: m.group(1) + VERIF + m.group(2), modele)
accueil.write_text(modele, encoding="utf-8")

# on repart de zéro pour ne pas laisser traîner les pages d'une loi ou d'un groupe disparu
for d in DOSSIERS:
    for p in (RACINE / d).glob("**/*.html") if (RACINE / d).exists() else []:
        p.unlink()
for f in FICHIERS:
    (RACINE / f).unlink(missing_ok=True)

for adresse, titre, desc in pages:
    if adresse == "/":
        continue
    cible = RACINE / (adresse.lstrip("/") + ".html")
    cible.parent.mkdir(parents=True, exist_ok=True)
    cible.write_text(remplir(modele, titre_page(titre), desc, adresse), encoding="utf-8")

(RACINE / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + "".join(f"<url><loc>{SITE}{a}</loc></url>\n" for a, _, _ in pages)
    + "</urlset>\n", encoding="utf-8")
(RACINE / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
print(f"{len(pages)} pages, mise à jour du {VERIF}")
