# Guide — Gérer le site Coding Host sans coder

Le site se met à jour tout seul à partir de **Google Drive** et **Google Sheets** :

| Vous voulez…                         | Vous faites…                                                       |
|--------------------------------------|--------------------------------------------------------------------|
| Ajouter des photos / vidéos          | Vous les déposez dans un dossier Google Drive                      |
| Publier un nouveau stage             | Vous ajoutez une ligne dans le Google Sheet                        |
| Voir qui a réservé                   | Vous regardez l'onglet « Réservations » (+ un email à chaque fois) |
| Fermer / rouvrir un stage            | Vous décochez / cochez la case « Publié »                          |

L'installation ci-dessous se fait **une seule fois** (environ 15 minutes).

---

## Étape 1 — Créer le dossier « Galerie site » dans Google Drive

1. Dans Google Drive (compte codinghost2025@gmail.com), créez un dossier **Galerie site**.
2. À l'intérieur, créez des dossiers de **catégories**, par exemple :
   - `Stages vacances`
   - `Cours à l'année`
   - `Remises de diplômes`
   - `Hackathons`
3. Dans chaque catégorie, créez un dossier par **album**, en commençant par l'année et le mois :
   - `2026-10 Stage de la Toussaint`
   - `2026-12 Stage de Noël TechWeek`

   → Sur le site, l'album s'appellera « Stage de la Toussaint », daté « Octobre 2026 ». Les albums les plus récents sont affichés en premier.
4. Ouvrez le dossier **Galerie site** et copiez la fin de son adresse, après `/folders/` :
   `https://drive.google.com/drive/folders/`**`1AbCdEfGhIjKlMnOp...`** ← c'est l'**ID du dossier**.

**Astuces**
- Photo de couverture d'un album : nommez le fichier `couverture.jpg`. Sinon, la première photo est utilisée.
- Les vidéos (MP4, MOV) fonctionnent aussi. Gardez-les courtes (moins de 2–3 minutes).
- Depuis votre téléphone : appli Google Drive → dossier de l'album → **+** → **Importer**. C'est tout.

## Étape 2 — Créer le Google Sheet et coller le script

1. Créez un nouveau Google Sheet nommé **Site Coding Host**.
2. Menu **Extensions → Apps Script**.
3. Effacez le contenu de l'éditeur et collez **tout** le fichier `google-apps-script/Code.gs`.
4. En haut du fichier, dans `REGLAGES`, remplissez :
   - `DOSSIER_GALERIE_ID` : l'ID copié à l'étape 1
   - `LIENS_PAIEMENT` : vos 4 liens de paiement Stripe (voir « Les liens de paiement Stripe » plus bas)
5. Cliquez sur 💾 **Enregistrer**.
6. Dans la liste déroulante en haut, choisissez la fonction **installation**, puis **Exécuter**.
   Google demande des autorisations : **Examiner les autorisations → votre compte → Paramètres avancés → Accéder à … (non sécurisé) → Autoriser**.
   (C'est normal : c'est votre propre script, il n'est pas « vérifié » par Google.)
7. Retournez dans le Sheet : 3 onglets sont créés — **Stages**, **Réservations**, **Contacts** — avec vos 2 semaines de TechWeek de Noël 2026 déjà remplies.

## Étape 3 — Publier le script (« Déployer »)

1. Dans Apps Script : bouton bleu **Déployer → Nouveau déploiement**.
2. Roue dentée → **Application Web**.
3. Réglages :
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
4. **Déployer** → copiez l'**URL de l'application Web** (elle finit par `/exec`).
5. Ouvrez le fichier `assets/config.js` du site et collez-la :
   ```js
   API_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
   // et vos 4 liens Stripe dans LIENS_SUMUP
   ```
6. Mettez le site en ligne (étape 5). C'est terminé ✅

> Si un jour vous modifiez le code du script : **Déployer → Gérer les déploiements → ✏️ → Version : Nouvelle version → Déployer**. L'URL reste la même.

---

## Au quotidien

### Publier un stage
Ajoutez une ligne dans l'onglet **Stages** (une ligne = une semaine de stage) :

| Colonne      | Exemple                                    | Remarque |
|--------------|--------------------------------------------|----------|
| ID           | `FEV27-S1`                                 | Laissez vide : il se remplit tout seul. **Ne le modifiez plus ensuite.** |
| Publié       | ☑                                          | Décochez pour cacher le stage |
| Période      | Stage d'hiver                              | Liste : Stage de la Toussaint / de Noël / d'hiver / de printemps / d'été. Sur le site, les stages sont regroupés par période (« Stage d'hiver 2027 ») |
| Titre        | TechWeek — Semaine 1                       | |
| Thème        | Le cadeau de Noël pour leur avenir !       | Petite phrase d'accroche |
| Âges         | Dès 8 ans                                  | |
| Date début   | 22/02/2027                                 | |
| Date fin     | 25/02/2027                                 | **Le lendemain de cette date, le stage disparaît tout seul du site** |
| Horaires     | 13h00 – 16h00                              | |
| Lieu         | 6 rue de la Tour, Thionville               | |
| Prix semaine | 185                                        | |
| Prix jour    | 50                                         | Laissez vide si on ne peut pas venir à la journée |
| Places       | 10                                         | Places restantes et « Complet » calculés automatiquement, jour par jour |
| Programme    | `Lundi : Minecraft \| Mardi : Minecraft \| Mercredi : GDevelop \| Jeudi : Robotique` | Séparez les jours par une barre « \| » |
| Image        | lien de partage Google Drive de l'affiche  | Facultatif. Un clic sur l'image ouvre l'affiche en grand |
| Description  | Le vendredi : remise des diplômes…         | |
| Lien Stripe (si différent) | | Seulement si ce stage a un prix spécial |

Le site est mis à jour en moins d'une minute.

### Paiement : carte (Stripe) ou virement
Le parent choisit **Carte bancaire** ou **Virement** au moment de réserver.

**Carte — liens Stripe rangés par montant.** Un « Payment Link » Stripe a un montant fixe. En haut du script,
`LIENS_PAIEMENT` associe chaque montant à son lien (50 €, 100 €, 185 €, 199 €…). Le site choisit tout seul
le lien du montant réservé, avec l'email du parent déjà rempli et la référence de la réservation
(colonne « Réf. paiement » du Sheet = « Client reference ID » dans Stripe).
Nouveau tarif ? Créez le lien dans Stripe et ajoutez une ligne dans `LIENS_PAIEMENT`.
Un stage peut aussi avoir ses propres liens : colonnes « Lien paiement (si différent) » (semaine)
et « Lien paiement jour (si différent) » (1 journée) de l'onglet Stages.
Pas de lien pour un montant (ex. 3 jours = 150 €) → le parent est prévenu que vous lui enverrez le lien.

**Virement.** Le RIB (réglage `RIB` du script) est affiché au parent juste après sa réservation et envoyé
par email, avec la référence à mettre dans le libellé du virement. Colonne « Mode de paiement » = Virement :
vérifiez votre compte, puis passez la ligne en « Payé ».

### Les vidéos de la page d'accueil
Déposez vos reels dans le dossier `videos/` nommés `accueil-1.mp4`, `accueil-2.mp4`… (jusqu'à 6).
Ils passent en boucle, sans le son, à la place de la photo. Gardez-les courts (10–30 s) et légers (moins de 4 Mo).

### Les programmes PDF des cours
Chaque cours a un bouton **Programme**. Déposez le PDF dans le dossier `docs/` avec **exactement** ce nom :

| Cours | Nom du fichier |
|---|---|
| Junior Scratch | programme-junior-scratch.pdf |
| Visio | programme-visio.pdf |
| Crafto | programme-crafto.pdf |
| Gameo | programme-gameo.pdf |
| Roblox Studio | programme-roblox.pdf |
| Unity | programme-unity.pdf |
| Python | programme-python.pdf |
| Python en ligne | programme-python-en-ligne.pdf |
| Python & IA | programme-python-ia.pdf |
| Python intensif | programme-python-intensif.pdf |
| Cours du soir Python | programme-cours-du-soir.pdf |
| Bureautique | programme-bureautique.pdf |
| Toolkits pour managers | programme-toolkits-managers.pdf |
| Business English | programme-business-english.pdf |
| Anglais Kids 5–7 ans | programme-anglais-5-7.pdf |
| Anglais Kids 8–12 ans | programme-anglais-8-12.pdf |
| Anglais adultes & ados 14+ | programme-anglais-adultes.pdf |
| English for Security Guards | programme-anglais-securite.pdf |
| English for Service à la Personne | programme-anglais-service-personne.pdf |

Tant qu'un PDF manque, le site en ligne affiche « Programme bientôt » à la place du bouton.

### Les demandes de cours d'essai
Le bouton **« Essai gratuit »** du site ouvre la page `essai.html` : le parent choisit le cours (filtré selon l'âge),
le créneau et la date (les jours fériés sont exclus). Chaque demande arrive dans l'onglet **Essais** du Google Sheet
(créé automatiquement à la première demande) + un email pour vous et un email de confirmation pour le parent.
Utilisez la colonne **Suivi** : À appeler → Confirmé → Venu → Inscrit ✅ (les lignes se colorent toutes seules).
Pour changer un horaire proposé : liste `COURS` au début du fichier `assets/essai.js`.

### Le récapitulatif de chaque matin
À activer une fois : dans Apps Script, choisissez la fonction **activerRappelQuotidien** puis **▷ Exécuter**.
Chaque matin vers 8h, le responsable reçoit un email avec : les essais « À appeler » depuis plus de 24h,
les essais prévus aujourd'hui / demain, et les réservations de stage pas encore payées. Rien à signaler → pas d'email.
Pour l'avoir tout de suite : menu **🌐 Site Coding Host → Envoyer le récapitulatif du jour maintenant**.

### Suivre les réservations
- À chaque réservation : une ligne dans **Réservations** + un email pour vous. Le parent reçoit aussi un email avec le lien de paiement.
- Quand le paiement Stripe est reçu → colonne **Paiement** = `Payé`.
- Si un parent ne paie pas → `Annulé` : la place est **automatiquement libérée** sur le site.

### Ajouter des photos
Déposez-les dans le bon dossier Drive. Elles apparaissent sur le site sous 10 minutes
(ou tout de suite via le menu **🌐 Site Coding Host → Mettre à jour la galerie maintenant** dans le Sheet).
Le script rend automatiquement les photos visibles par lien : rien à régler.
Une photo n'apparaît pas ? Menu **🌐 Site Coding Host → Réparer les photos qui ne s'affichent pas**.

### ⚠️ Droit à l'image (RGPD)
Ne publiez que les photos des enfants dont les parents ont donné leur accord. Le formulaire de réservation
pose la question (colonne **Droit à l'image** dans « Réservations »). Pour les cours à l'année, faites signer
une autorisation à l'inscription. Pour retirer une photo : supprimez-la du dossier Drive.

---

## Étape 5 — Mettre le site en ligne
Envoyez **tout le contenu** du dossier `nouveau-site/` (sauf `GUIDE.md` et `google-apps-script/`) à la racine
de votre hébergement codinghost.fr, à la place des anciens fichiers (gardez une copie de l'ancien site).
Pour tester avant la mise en ligne : ouvrez `index.html` dans Chrome (une fois `API_URL` rempli, les stages et la galerie s'affichent même en local).

Pour modifier un texte (prix, horaires, description d'un cours) : ouvrez le fichier `.html` de la page
dans un éditeur de texte et changez la phrase.
