/**
 * ═══════════════════════════════════════════════════════════════
 *  CODING HOST ACADÉMIE — « back-office » du site (Google Apps Script)
 *
 *  - Lit les stages dans l'onglet « Stages » de ce Google Sheet
 *    (les stages dont la date de fin est passée disparaissent seuls du site)
 *  - Enregistre les réservations dans l'onglet « Réservations »
 *    et gère les places restantes jour par jour
 *  - Lit les photos / vidéos du dossier Google Drive « Galerie site »
 *  - Envoie un email à l'école (et au parent) à chaque réservation
 *
 *  Installation : voir GUIDE.md. Seule la partie RÉGLAGES est à remplir.
 * ═══════════════════════════════════════════════════════════════
 */

// ───────────── RÉGLAGES ─────────────
const REGLAGES = {
  // ID du dossier Drive « Galerie site » (la fin de l'adresse du dossier, après /folders/)
  DOSSIER_GALERIE_ID: '1mS2y9hEyyVlG07A2ACdz39xqro7Q67FP',

  // Vos liens de paiement Stripe, rangés PAR MONTANT (un Payment Link Stripe a un montant fixe).
  // Le site choisit tout seul le lien qui correspond au montant de la réservation,
  // et y ajoute l'email du parent et la référence de la réservation.
  // Pour un nouveau montant : créez le lien dans Stripe et ajoutez une ligne ici.
  LIENS_PAIEMENT: {
    '50':  'https://buy.stripe.com/cNi4gAdmzfKn9m371f4800q',   // 1 journée
    '100': 'https://buy.stripe.com/14A9AUfuH2XBgOvbhv4800r',   // 2 journées
    '185': 'https://buy.stripe.com/eVqeVegyLbu71TBadr4800t',   // semaine Stage de Noël
    '199': 'https://buy.stripe.com/bJefZi96j69N9m399n4800s'    // semaine (tarif 199 €)
    // '150': 'https://buy.stripe.com/...',                    // 3 journées : lien à créer
  },

  // Paiement par virement (le RIB est affiché au parent APRÈS sa réservation, et envoyé par email)
  VIREMENT_ACTIF: true,
  RIB: {
    titulaire: 'CODING HOST',
    iban: 'FR83 3000 2070 3400 0007 2134 A14',
    bic: 'CRLYFRPP',
    banque: 'LCL — Thionville'
  },

  // Qui reçoit les notifications de réservation / contact
  EMAIL_ECOLE: 'codinghost2025@gmail.com',
  NOM_ECOLE: 'Coding Host Académie',
  TELEPHONE: '06 21 68 09 20',
  ADRESSE: '6 rue de la Tour, Thionville',
  // Envoyer un email de confirmation au parent après sa pré-réservation
  EMAIL_AU_PARENT: true,
  // Rendre automatiquement visibles (« tous les utilisateurs disposant du lien ») les fichiers déposés dans la galerie
  PARTAGE_AUTO: true
};
// ────────────────────────────────────

const VERSION = '2026-11-18'; // pour vérifier quelle version est en ligne : adresse du script + ?action=version
const ONGLET_STAGES = 'Stages';
const ONGLET_RESA = 'Réservations';
const ONGLET_CONTACT = 'Contacts';
const ONGLET_ESSAIS = 'Essais';
const ENTETES_ESSAIS = ['Reçu le', 'Pour', 'Élève', 'Âge', 'Cours', 'Créneau', 'Date souhaitée', 'Parent / Nom', 'Téléphone', 'Email', 'Connu par', 'Message', 'Suivi', 'Notes'];
const SUIVI_ESSAIS = ['À appeler', 'Confirmé', 'Venu', 'Inscrit ✅', 'Pas venu', 'Pas intéressé'];
const PERIODES = ['Stage de la Toussaint', 'Stage de Noël', 'Stage d\'hiver', 'Stage de printemps', 'Stage d\'été'];
const ENTETES_STAGES = ['ID', 'Publié', 'Période', 'Titre', 'Thème', 'Âges', 'Date début', 'Date fin', 'Horaires', 'Lieu', 'Prix semaine', 'Prix jour', 'Places', 'Programme', 'Image', 'Description', 'Lien paiement (si différent)', 'Lien paiement jour (si différent)'];
const ENTETES_RESA = ['Reçue le', 'ID stage', 'Stage', 'Enfant', 'Âge', 'Parent', 'Téléphone', 'Email', 'Formule', 'Jours', 'Montant', 'Remarques', 'Droit à l\'image', 'Paiement', 'Codes jours', 'Réf. paiement', 'Mode de paiement'];
const ENTETES_CONTACT = ['Reçu le', 'Nom', 'Email', 'Téléphone', 'Intérêt', 'Message'];
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

/* ═════════ API (appelée par le site) ═════════ */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'all';
  if (action === 'version') return json_({ version: VERSION, paiement: Object.keys(REGLAGES.LIENS_PAIEMENT || {}).map((k) => k + ' €'), virement: !!REGLAGES.VIREMENT_ACTIF });
  try {
    const out = {};
    if (action === 'all' || action === 'stages') out.stages = lireStages_();
    if (action === 'all' || action === 'albums') out.albums = lireAlbumsCache_();
    return json_(out);
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (_) { return json_({ ok: false, error: 'format' }); }
  if (d.website) return json_({ ok: true }); // robot
  if (d.type === 'reservation') return json_(reserver_(d));
  if (d.type === 'contact') return json_(contact_(d));
  if (d.type === 'essai') return json_(essai_(d));
  return json_({ ok: false, error: 'type' });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ═════════ STAGES ═════════ */
function lireStages_() {
  const cache = CacheService.getScriptCache();
  const c = cache.get('stages');
  if (c) return JSON.parse(c);

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(ONGLET_STAGES);
  if (!sh) return [];
  const rows = sh.getDataRange().getValues();
  const head = rows.shift().map((h) => String(h).trim());
  const get = (r, ...noms) => { for (const n of noms) { const i = head.indexOf(n); if (i > -1 && r[i] !== '' && r[i] != null) return r[i]; } return ''; };
  const tz = ss.getSpreadsheetTimeZone();
  const aujourdhui = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const pris = compterReservations_();
  const out = [];

  rows.forEach((r, i) => {
    if (!get(r, 'Titre')) return;
    const pubV = get(r, 'Publié'), pub = String(pubV).toLowerCase();
    if (!(pubV === true || pub === 'oui' || pub === 'x' || pub === 'true')) return;
    const dateDebut = dateIso_(get(r, 'Date début'), tz);
    const dateFin = dateIso_(get(r, 'Date fin'), tz) || dateDebut;
    if (dateFin && dateFin < aujourdhui) return; // stage terminé : il disparaît du site

    let id = String(get(r, 'ID')).trim();
    if (!id) { // ID automatique si la case est vide
      id = 'S' + Utilities.formatDate(new Date(), tz, 'yyMMdd') + '-' + (i + 2);
      sh.getRange(i + 2, head.indexOf('ID') + 1).setValue(id);
    }
    const places = Number(get(r, 'Places')) || 0;
    const jours = joursDuStage_(dateDebut, dateFin);
    const parJour = {};
    jours.forEach((j) => { parJour[j] = places ? Math.max(0, places - ((pris[id] || {})[j] || 0)) : null; });
    const restantes = places ? (jours.length ? Math.min.apply(null, jours.map((j) => parJour[j])) : Math.max(0, places - ((pris[id] || {})._ || 0))) : null;

    out.push({
      id: id,
      periode: String(get(r, 'Période', 'Vacances')),
      titre: String(get(r, 'Titre')),
      theme: String(get(r, 'Thème')),
      ages: String(get(r, 'Âges')),
      dateDebut: dateDebut,
      dateFin: dateFin,
      horaires: String(get(r, 'Horaires')),
      lieu: String(get(r, 'Lieu')),
      prix: String(get(r, 'Prix semaine', 'Prix')),
      prixJour: String(get(r, 'Prix jour')),
      places: places,
      restantes: restantes,
      restantesParJour: places ? parJour : null,
      programme: String(get(r, 'Programme')).split(/\s*[|\n]\s*/).filter(String),
      image: urlImage_(String(get(r, 'Image'))),
      description: String(get(r, 'Description'))
    });
  });
  cache.put('stages', JSON.stringify(out), 60);
  return out;
}

/** Les jours (hors week-end) entre deux dates, au format 2026-12-21 */
function joursDuStage_(a, b) {
  const out = [];
  if (!a) return out;
  const d = new Date(a + 'T12:00:00Z'), fin = new Date((b || a) + 'T12:00:00Z');
  for (let k = 0; d <= fin && k < 31; k++) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** { idStage: { '2026-12-21': 3, ... } } — les réservations annulées ne comptent pas */
function compterReservations_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(ONGLET_RESA);
  const n = {};
  if (!sh || sh.getLastRow() < 2) return n;
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const iId = head.indexOf('ID stage'), iPay = head.indexOf('Paiement'), iCodes = head.indexOf('Codes jours');
  sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues().forEach((r) => {
    if (/annul/i.test(String(r[iPay]))) return;
    const id = String(r[iId]);
    n[id] = n[id] || {};
    const codes = iCodes > -1 ? String(r[iCodes]).split(',').filter(String) : [];
    if (!codes.length) codes.push('_');
    codes.forEach((j) => { n[id][j] = (n[id][j] || 0) + 1; });
  });
  return n;
}

function reserver_(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    CacheService.getScriptCache().remove('stages');
    const s = lireStages_().find((x) => x.id === String(d.stageId));
    if (!s) return { ok: false, error: 'stage introuvable' };
    for (const k of ['enfant', 'parent', 'telephone', 'email']) if (!String(d[k] || '').trim()) return { ok: false, error: 'champ manquant : ' + k };

    const tous = joursDuStage_(s.dateDebut, s.dateFin);
    let jours = d.formule === 'jours' ? (d.jours || []).filter((j) => tous.indexOf(j) > -1) : tous.slice();
    if (d.formule === 'jours' && !jours.length) return { ok: false, error: 'choisissez au moins un jour' };
    const semaine = d.formule !== 'jours' || jours.length === tous.length;
    if (semaine) jours = tous.slice();
    if (s.places) {
      const pleins = jours.filter((j) => (s.restantesParJour || {})[j] <= 0);
      if (pleins.length || (!jours.length && s.restantes <= 0)) return { ok: false, error: 'complet', jours: pleins };
    }
    const montant = semaine ? Number(s.prix) : jours.length * Number(s.prixJour);
    const libJours = semaine ? 'Semaine complète' : jours.map(jourCourt_).join(', ');
    const sh = feuille_(ONGLET_RESA, ENTETES_RESA);
    sh.appendRow([new Date(), s.id, s.periode + ' — ' + s.titre, propre_(d.enfant), propre_(d.age), propre_(d.parent), "'" + String(d.telephone || '').slice(0, 30), propre_(d.email), semaine ? 'Semaine' : 'À la journée', libJours, montant || '', propre_(d.remarques), d.droitImage === 'OUI' ? 'OUI' : 'NON', 'En attente', jours.join(',')]);
    CacheService.getScriptCache().remove('stages');

    // Référence de la réservation (= « Client reference ID » dans Stripe, ou libellé du virement)
    const ligne = sh.getLastRow();
    const ref = (s.id + '-' + ligne).replace(/[^\w-]/g, '');
    const virement = d.modePaiement === 'virement' && REGLAGES.VIREMENT_ACTIF;
    const nCol = ENTETES_RESA.length; // colonnes « Réf. paiement » et « Mode de paiement » (ajoutées si absentes)
    if (sh.getRange(1, nCol - 1).getValue() !== 'Réf. paiement') sh.getRange(1, nCol - 1).setValue('Réf. paiement');
    if (sh.getRange(1, nCol).getValue() !== 'Mode de paiement') sh.getRange(1, nCol).setValue('Mode de paiement');
    sh.getRange(ligne, nCol - 1, 1, 2).setValues([[ref, virement ? 'Virement' : 'Carte (Stripe)']]);
    // Lien : 1) lien propre au stage (colonnes du Sheet) 2) sinon le lien Stripe de ce montant
    const L = REGLAGES.LIENS_PAIEMENT || {};
    let payUrl = virement ? '' : ((semaine ? lienStage_(s.id, 'semaine') : (jours.length === 1 ? lienStage_(s.id, 'jour') : '')) || L[String(montant)] || '');
    if (payUrl && /stripe\.com/.test(payUrl)) payUrl += (payUrl.indexOf('?') > -1 ? '&' : '?') + 'prefilled_email=' + encodeURIComponent(d.email) + '&client_reference_id=' + ref;
    const R = REGLAGES.RIB || {};
    const texteRib = `Titulaire : ${R.titulaire}\nIBAN : ${R.iban}\nBIC : ${R.bic}\nBanque : ${R.banque}\nMontant : ${montant} €\nLibellé du virement (important) : ${ref}`;
    const resume = `${s.periode} — ${s.titre}${s.theme ? ' (' + s.theme + ')' : ''}\nDates : ${libJours === 'Semaine complète' ? 'du ' + jourCourt_(s.dateDebut) + ' au ' + jourCourt_(s.dateFin) : libJours}\nHoraires : ${s.horaires}\nLieu : ${s.lieu || REGLAGES.ADRESSE}\nMontant : ${montant} €`;
    try {
      MailApp.sendEmail({
        to: REGLAGES.EMAIL_ECOLE, replyTo: d.email,
        subject: `🎟️ Réservation ${s.periode} : ${d.enfant} — ${libJours}`,
        body: `${resume}\n\nEnfant : ${d.enfant} (${d.age} ans)\nParent : ${d.parent}\nTél : ${d.telephone}\nEmail : ${d.email}\nRemarques : ${d.remarques || '-'}\nDroit à l'image : ${d.droitImage}\n\nRéférence : ${ref}\nMode de paiement : ${virement ? 'VIREMENT (vérifiez votre compte LCL, libellé ' + ref + ')' : 'carte (Stripe)'}\n${virement || payUrl ? '' : '⚠️ Pas de lien Stripe pour ' + montant + ' € : créez-le dans Stripe et envoyez-le au parent (ou ajoutez-le dans LIENS_PAIEMENT).'}\nPensez à passer la ligne en « Payé » dans le Google Sheet une fois le paiement reçu.`
      });
      if (REGLAGES.EMAIL_AU_PARENT) MailApp.sendEmail({
        to: d.email, replyTo: REGLAGES.EMAIL_ECOLE, name: REGLAGES.NOM_ECOLE,
        subject: `Votre réservation : ${s.periode} — ${s.titre}`,
        body: `Bonjour ${d.parent},\n\nMerci ! La place de ${d.enfant} est pré-réservée :\n\n${resume}\n\n` +
          (virement ? `Pour la confirmer, merci de faire un virement de ${montant} € sur notre compte :\n\n${texteRib}\n\nLa place est confirmée à réception du virement.\n\n`
            : payUrl ? `Pour la confirmer, merci de régler ${montant} € par carte ici (paiement sécurisé Stripe) :\n${payUrl}\n\n` : `Nous vous envoyons très vite le lien de paiement de ${montant} €.\n\n`) +
          `À très vite,\nL'équipe ${REGLAGES.NOM_ECOLE}\n${REGLAGES.TELEPHONE} · ${REGLAGES.ADRESSE}`
      });
    } catch (mailErr) { console.error('❌ Email de réservation NON envoyé : ' + mailErr); }

    return { ok: true, payUrl: payUrl || '', montant: montant, ref: ref, virement: virement ? R : null };
  } finally {
    lock.releaseLock();
  }
}

function lienStage_(id, type) {
  const sh = SpreadsheetApp.getActive().getSheetByName(ONGLET_STAGES);
  const v = sh.getDataRange().getValues(), h = v[0].map(String);
  // Ajoute la colonne « Lien paiement jour » si elle n'existe pas encore
  if (!h.some((x) => /^Lien .*jour/i.test(x))) { sh.getRange(1, h.length + 1).setValue('Lien paiement jour (si différent)'); h.push('Lien paiement jour (si différent)'); }
  const iId = h.indexOf('ID');
  const iL = h.findIndex((x) => /^Lien (SumUp|paiement|Stripe)/i.test(x) && (type === 'jour' ? /jour/i.test(x) : !/jour/i.test(x)));
  if (iL < 0) return '';
  const row = v.find((r) => String(r[iId]) === id);
  return row ? String(row[iL] || '') : '';
}

function essai_(d) {
  for (const k of ['nom', 'telephone', 'email']) if (!String(d[k] || '').trim()) return { ok: false, error: 'champ manquant : ' + k };
  const sh = feuille_(ONGLET_ESSAIS, ENTETES_ESSAIS);
  if (sh.getLastRow() === 1) preparerEssais_(sh);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(d.date || '') ? new Date(d.date + 'T12:00:00') : (d.dateTexte || 'À convenir');
  sh.appendRow([new Date(), propre_(d.pour), propre_(d.enfant), propre_(d.age), propre_(d.cours), propre_(d.creneau), date, propre_(d.nom), "'" + String(d.telephone || '').slice(0, 30), propre_(d.email), propre_(d.source), propre_(d.message), 'À appeler', '']);
  const qui = d.enfant ? `${d.enfant}${d.age ? ' (' + d.age + ' ans)' : ''}` : d.nom;
  try {
    MailApp.sendEmail({
      to: REGLAGES.EMAIL_ECOLE, replyTo: d.email,
      subject: `⭐ Cours d'essai : ${qui} — ${d.cours} — ${d.dateTexte}`,
      body: `Nouvelle demande de cours d'essai\n\nPour : ${d.pour}\nÉlève : ${qui}\nCours : ${d.cours}\nCréneau : ${d.creneau}\nDate souhaitée : ${d.dateTexte}\n\nContact : ${d.nom}\nTél : ${d.telephone}\nEmail : ${d.email}\nConnu par : ${d.source || '-'}\nMessage : ${d.message || '-'}\n\n→ À rappeler sous 24h pour confirmer. Mettez à jour la colonne « Suivi » dans l'onglet Essais.`
    });
    MailApp.sendEmail({
      to: d.email, replyTo: REGLAGES.EMAIL_ECOLE, name: REGLAGES.NOM_ECOLE,
      subject: `Votre cours d'essai gratuit — ${d.cours}`,
      body: `Bonjour ${d.nom},\n\nMerci pour votre demande de cours d'essai gratuit !\n\nCours : ${d.cours}${d.enfant ? '\nÉlève : ' + qui : ''}\nDate souhaitée : ${d.dateTexte}${d.creneau && d.creneau !== 'À convenir' ? ' (' + d.creneau + ')' : ''}\nAdresse : ${REGLAGES.ADRESSE}\n\nNous vous appelons sous 24h pour confirmer.\n\nÀ très vite,\nL'équipe ${REGLAGES.NOM_ECOLE}\n${REGLAGES.TELEPHONE}`
    });
  } catch (err) { console.error('❌ Email d\'essai NON envoyé : ' + err); }
  return { ok: true };
}

function preparerEssais_(sh) {
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, ENTETES_ESSAIS.length).setFontWeight('bold').setBackground('#ffc23d').setFontColor('#0b0d1f');
  sh.getRange('G2:G2000').setNumberFormat('dddd dd/mm/yyyy');
  sh.getRange('M2:M2000').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(SUIVI_ESSAIS).build());
  // Couleurs automatiques selon le suivi
  const r = sh.getRange('A2:N2000'), regle = (txt, fond) => SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$M2="' + txt + '"').setBackground(fond).setRanges([r]).build();
  sh.setConditionalFormatRules([regle('À appeler', '#fff3d6'), regle('Confirmé', '#e6eeff'), regle('Venu', '#efe6ff'), regle('Inscrit ✅', '#e2f6ee'), regle('Pas venu', '#fde8e8'), regle('Pas intéressé', '#eeeeee')]);
}

function contact_(d) {
  feuille_(ONGLET_CONTACT, ENTETES_CONTACT).appendRow([new Date(), propre_(d.nom), propre_(d.email), "'" + String(d.telephone || '').slice(0, 30), propre_(d.cours), propre_(d.message)]);
  try {
    MailApp.sendEmail({ to: REGLAGES.EMAIL_ECOLE, replyTo: d.email, subject: `✉️ Message du site : ${d.nom} (${d.cours || 'contact'})`, body: `Nom : ${d.nom}\nEmail : ${d.email}\nTél : ${d.telephone}\nIntérêt : ${d.cours}\n\n${d.message}` });
  } catch (err) { console.error('❌ Email de contact NON envoyé : ' + err); }
  return { ok: true };
}

/* ═════════ GALERIE (Google Drive) ═════════
   Dossier « Galerie site »
     ├── Stages vacances            ← une catégorie
     │     ├── 2026-10 Stage de la Toussaint     ← un album (photos + vidéos)
     │     └── 2026-12 Stage de Noël TechWeek
     ├── Remises de diplômes
     │     └── 2026-06 Diplômes Thionville
     └── 2026-03 Hackathon          ← un album sans catégorie marche aussi
*/
function lireAlbumsCache_() {
  const c = getGros_('albums');
  if (c) return JSON.parse(c);
  return rafraichirGalerie();
}

/** Relit tout le dossier Drive (lancé automatiquement toutes les 10 min). */
let TOUT_VERIFIER = false;
const NOUVEAU_DEPUIS = new Date(Date.now() - 3 * 24 * 3600 * 1000);
let RAPPORT = null; // rempli par reparerPhotos()
function partager_(f, album) {
  let etat = 'OK — visible par tous', pb = '';
  try {
    if (f.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK) {
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      etat = 'Corrigé — maintenant visible par tous';
    }
  } catch (err) {
    etat = '❌ PRIVÉ — invisible sur le site';
    pb = String(err.message || err);
    if (/permission|autoris|access/i.test(pb)) pb += ' → Ce fichier appartient à un autre compte Google : téléchargez-le puis ré-importez-le depuis le compte Coding Host.';
  }
  if (RAPPORT && album !== undefined) RAPPORT.push([album, f.getName(), f.getMimeType(), etat, pb, 'https://drive.google.com/file/d/' + f.getId() + '/view']);
}

/** Menu « Réparer les photos » : rend visibles TOUS les fichiers de la galerie (à lancer en cas de photo manquante). */
function reparerPhotos() {
  TOUT_VERIFIER = true;
  RAPPORT = [];
  const a = rafraichirGalerie();
  // Rapport dans l'onglet « Diagnostic galerie »
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName('Diagnostic galerie');
  if (!sh) sh = ss.insertSheet('Diagnostic galerie');
  sh.clear();
  const rows = [['Album', 'Fichier', 'Type', 'Visibilité', 'Problème', 'Ouvrir dans Drive']].concat(RAPPORT);
  sh.getRange(1, 1, rows.length, 6).setValues(rows);
  sh.getRange(1, 1, 1, 6).setFontWeight('bold');
  sh.setFrozenRows(1); sh.autoResizeColumns(1, 4);
  const ko = RAPPORT.filter((r) => /PRIVÉ/.test(r[3])).length;
  const msg = RAPPORT.length + ' fichiers vérifiés dans ' + a.length + ' albums' + (ko ? ' — ⚠️ ' + ko + ' fichier(s) restent privés, voir l\'onglet « Diagnostic galerie »' : ' — tout est visible ✅');
  try { ss.toast(msg, 'Galerie', 15); } catch (_) {}
  console.log(msg);
}

function rafraichirGalerie() {
  const root = DriveApp.getFolderById(REGLAGES.DOSSIER_GALERIE_ID);
  if (REGLAGES.PARTAGE_AUTO) partager_(root); // le partage du dossier s'applique à tout ce qu'il contient
  const albums = [];
  const sub = root.getFolders();
  while (sub.hasNext()) {
    const f = sub.next();
    const enfants = f.getFolders();
    if (enfants.hasNext()) { // c'est une catégorie
      const cat = f.getName();
      const direct = album_(f, cat); if (direct) albums.push(direct);
      while (enfants.hasNext()) { const a = album_(enfants.next(), cat); if (a) albums.push(a); }
    } else {
      const a = album_(f, ''); if (a) albums.push(a);
    }
  }
  albums.sort((a, b) => (b.tri || '').localeCompare(a.tri || ''));
  albums.forEach((a) => delete a.tri);
  putGros_('albums', JSON.stringify(albums), 21600);
  return albums;
}

function album_(folder, categorie) {
  const items = [];
  const files = folder.getFiles();
  let cover = null;
  while (files.hasNext()) {
    const f = files.next();
    const mime = f.getMimeType(), nomF = f.getName().toLowerCase();
    const isVid = mime.indexOf('video/') === 0 || /\.(mp4|mov|m4v|webm|avi)$/.test(nomF);
    const isImg = !isVid && (mime.indexOf('image/') === 0 || /\.(jpe?g|png|heic|heif|webp|gif)$/.test(nomF));
    if (!isImg && !isVid) continue;
    if (REGLAGES.PARTAGE_AUTO && (TOUT_VERIFIER || f.getDateCreated() > NOUVEAU_DEPUIS)) partager_(f, (categorie ? categorie + ' / ' : '') + folder.getName());
    const id = f.getId();
    const it = {
      id: id, type: isVid ? 'video' : 'image', name: f.getName(),
      thumb: 'https://lh3.googleusercontent.com/d/' + id + '=w600',
      full: 'https://lh3.googleusercontent.com/d/' + id + '=w1600'
    };
    if (isVid) it.embed = 'https://drive.google.com/file/d/' + id + '/preview';
    if (/^(couverture|cover)/i.test(f.getName())) cover = it;
    items.push(it);
  }
  if (!items.length) return null;
  items.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
  // « 2026-10 Stage de la Toussaint » → date « Octobre 2026 », nom « Stage de la Toussaint »
  const name = folder.getName();
  const m = name.match(/^(\d{4})[-_. ]?(\d{1,2})?[\s\-_·]*(.*)$/);
  let nom = name, date = '', tri = Utilities.formatDate(folder.getLastUpdated(), 'UTC', 'yyyy-MM-dd');
  if (m) {
    nom = m[3] || name; date = (m[2] ? MOIS[Number(m[2]) - 1] + ' ' : '') + m[1];
    tri = m[1] + '-' + ('0' + (m[2] || '1')).slice(-2);
  }
  const firstImg = items.find((x) => x.type === 'image');
  const c = cover || firstImg || items[0];
  return { nom: nom, categorie: categorie, date: date, cover: c.thumb, coverId: c.id, items: items, tri: tri };
}

/* ═════════ MISE EN PLACE (à lancer une seule fois) ═════════ */
function installation() {
  const st = feuille_(ONGLET_STAGES, ENTETES_STAGES);
  if (st.getLastRow() < 2) {
    const prog = 'Lundi : Minecraft | Mardi : Minecraft | Mercredi : GDevelop | Jeudi : Robotique & anglais technique';
    const desc = 'Le vendredi : remise des diplômes et présentation des projets aux parents !';
    st.appendRow(['NOEL26-S1', true, 'Stage de Noël', 'TechWeek — Semaine 1', 'Le cadeau de Noël pour leur avenir !', 'Dès 8 ans', new Date(2026, 11, 21), new Date(2026, 11, 24), '13h00 – 16h00', '6 rue de la Tour, Thionville', 185, 50, 10, prog, '', desc, '']);
    st.appendRow(['NOEL26-S2', true, 'Stage de Noël', 'TechWeek — Semaine 2', 'Le cadeau de Noël pour leur avenir !', 'Dès 8 ans', new Date(2026, 11, 28), new Date(2026, 11, 31), '13h00 – 16h00', '6 rue de la Tour, Thionville', 185, 50, 10, prog, '', desc, '']);
  }
  st.getRange('B2:B300').insertCheckboxes();
  st.getRange('C2:C300').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(PERIODES).setAllowInvalid(true).build());
  st.getRange('G2:H300').setNumberFormat('dd/mm/yyyy');
  st.setFrozenRows(1); st.getRange(1, 1, 1, ENTETES_STAGES.length).setFontWeight('bold').setBackground('#0b0d1f').setFontColor('#ffffff');
  const rs = feuille_(ONGLET_RESA, ENTETES_RESA);
  rs.setFrozenRows(1); rs.getRange(1, 1, 1, ENTETES_RESA.length).setFontWeight('bold').setBackground('#2f6bff').setFontColor('#ffffff');
  rs.getRange('N2:N2000').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['En attente', 'Payé', 'Annulé']).build());
  rs.hideColumns(ENTETES_RESA.length); // « Codes jours » : utilisée par le site, inutile de la voir
  const es = feuille_(ONGLET_ESSAIS, ENTETES_ESSAIS);
  preparerEssais_(es);
  const ct = feuille_(ONGLET_CONTACT, ENTETES_CONTACT);
  ct.setFrozenRows(1); ct.getRange(1, 1, 1, ENTETES_CONTACT.length).setFontWeight('bold');

  // Rafraîchissement automatique de la galerie toutes les 10 minutes
  ScriptApp.getProjectTriggers().forEach((t) => { if (t.getHandlerFunction() === 'rafraichirGalerie') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('rafraichirGalerie').timeBased().everyMinutes(10).create();
  rafraichirGalerie();
  console.log('✅ Installation terminée ! Il reste à « Déployer » le script (voir GUIDE.md, étape 3).');
  try { SpreadsheetApp.getActive().toast('✅ Installation terminée !'); } catch (_) {}
}

/* ═════════ RAPPEL CHAQUE MATIN ═════════
   Un email récapitulatif au responsable (8h) avec :
   - les demandes d'essai encore « À appeler » depuis plus de 24h
   - les essais prévus aujourd'hui et demain (pour préparer la séance)
   - les réservations de stage pas encore payées
   Rien à signaler → pas d'email.
   À lancer UNE fois depuis l'éditeur : activerRappelQuotidien */
function activerRappelQuotidien() {
  ScriptApp.getProjectTriggers().forEach((t) => { if (t.getHandlerFunction() === 'rappelQuotidien') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('rappelQuotidien').timeBased().everyDays(1).atHour(8).inTimezone('Europe/Paris').create();
  const envoye = rappelQuotidien(true);
  console.log('✅ Rappel activé : un email chaque matin vers 8h à ' + REGLAGES.EMAIL_ECOLE + (envoye ? ' (un premier récapitulatif vient d\'être envoyé)' : ' (rien à signaler aujourd\'hui)'));
}

function rappelQuotidien(manuel) {
  const ss = SpreadsheetApp.getActive(), tz = 'Europe/Paris';
  const maintenant = new Date(), il_y_a_24h = new Date(maintenant.getTime() - 24 * 3600 * 1000);
  const jour = (d) => Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  const auj = jour(maintenant), demain = jour(new Date(maintenant.getTime() + 24 * 3600 * 1000));
  const fdate = (v) => v instanceof Date ? Utilities.formatDate(v, tz, 'dd/MM/yyyy') : String(v || '');
  const lire = (nom) => {
    const sh = ss.getSheetByName(nom);
    if (!sh || sh.getLastRow() < 2) return [];
    const v = sh.getDataRange().getValues(), h = v.shift().map(String);
    return v.map((r, i) => { const o = { _ligne: i + 2 }; h.forEach((k, j) => (o[k] = r[j])); return o; });
  };

  // 1. Essais à rappeler (> 24h)
  const essais = lire(ONGLET_ESSAIS);
  const aRappeler = essais.filter((e) => String(e['Suivi']) === 'À appeler' && e['Reçu le'] instanceof Date && e['Reçu le'] < il_y_a_24h);
  // 2. Essais prévus aujourd'hui / demain
  const prevus = essais.filter((e) => e['Date souhaitée'] instanceof Date && [auj, demain].indexOf(jour(e['Date souhaitée'])) > -1 && !/pas |inscrit/i.test(String(e['Suivi'])));
  // 3. Réservations non payées
  const resas = lire(ONGLET_RESA).filter((r) => /attente/i.test(String(r['Paiement'])) && r['Reçue le'] instanceof Date);

  if (!aRappeler.length && !prevus.length && !resas.length) {
    if (manuel === true) try { ss.toast('Rien à signaler aujourd\'hui ✅'); } catch (_) {}
    return false;
  }

  const td = 'style="padding:8px 10px;border-bottom:1px solid #e4e5ef;font-size:14px;vertical-align:top"';
  const th = 'style="padding:8px 10px;text-align:left;font-size:12px;color:#5b5e78;background:#f4f5fb;text-transform:uppercase"';
  const tel = (t) => { const n = String(t || '').replace(/[^\d+]/g, ''); return n ? `<a href="tel:${n}" style="color:#2f6bff;font-weight:bold">${t}</a>` : ''; };
  const depuis = (d) => { const h = Math.floor((maintenant - d) / 3600000); return h < 48 ? h + ' h' : Math.floor(h / 24) + ' jours'; };
  const table = (titres, lignes) => `<table style="border-collapse:collapse;width:100%;margin:8px 0 26px;border:1px solid #e4e5ef">` +
    `<tr>${titres.map((t) => `<th ${th}>${t}</th>`).join('')}</tr>` + lignes.map((l) => `<tr>${l.map((c) => `<td ${td}>${c}</td>`).join('')}</tr>`).join('') + `</table>`;

  let html = `<div style="font-family:Arial,sans-serif;color:#14152b;max-width:760px">
    <h2 style="margin:0 0 4px">☀️ Récapitulatif du ${Utilities.formatDate(maintenant, tz, 'dd/MM/yyyy')}</h2>
    <p style="color:#5b5e78;margin:0 0 22px">Coding Host Académie — ce qui demande votre attention aujourd'hui.</p>`;

  if (aRappeler.length) html += `<h3 style="margin:0;color:#c25e00">📞 ${aRappeler.length} demande(s) d'essai à rappeler (depuis plus de 24h)</h3>` +
    table(['Reçue il y a', 'Élève', 'Cours', 'Date souhaitée', 'Contact', 'Téléphone'],
      aRappeler.map((e) => [depuis(e['Reçu le']), `${e['Élève'] || '-'}${e['Âge'] ? ' (' + e['Âge'] + ' ans)' : ''}`, e['Cours'], fdate(e['Date souhaitée']), e['Parent / Nom'], tel(e['Téléphone'])]));

  if (prevus.length) html += `<h3 style="margin:0;color:#2f6bff">🗓️ ${prevus.length} essai(s) prévu(s) aujourd'hui ou demain</h3>` +
    table(['Date', 'Créneau', 'Élève', 'Cours', 'Contact', 'Suivi'],
      prevus.map((e) => [jour(e['Date souhaitée']) === auj ? '<b>Aujourd\'hui</b>' : 'Demain', e['Créneau'], `${e['Élève'] || '-'}${e['Âge'] ? ' (' + e['Âge'] + ' ans)' : ''}`, e['Cours'], `${e['Parent / Nom']}<br>${tel(e['Téléphone'])}`, e['Suivi']]));

  if (resas.length) html += `<h3 style="margin:0;color:#e5484d">💳 ${resas.length} réservation(s) de stage non payée(s)</h3>` +
    table(['Reçue il y a', 'Stage', 'Enfant', 'Jours', 'Montant', 'Mode', 'Réf.', 'Parent', 'Téléphone'],
      resas.map((r) => [depuis(r['Reçue le']), r['Stage'], r['Enfant'], r['Jours'], (r['Montant'] || '') + ' €', r['Mode de paiement'] || '-', r['Réf. paiement'] || '', r['Parent'], tel(r['Téléphone'])])) +
    `<p style="font-size:13px;color:#5b5e78;margin-top:-14px">Paiement reçu → mettez « Payé ». Le parent ne viendra pas → mettez « Annulé » (la place se libère sur le site).</p>`;

  html += `<p style="margin-top:10px"><a href="${ss.getUrl()}" style="background:#ffc23d;color:#0b0d1f;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block">Ouvrir le Google Sheet</a></p></div>`;

  const nb = aRappeler.length + prevus.length + resas.length;
  MailApp.sendEmail({ to: REGLAGES.EMAIL_ECOLE, name: REGLAGES.NOM_ECOLE, subject: `☀️ Récap du jour : ${nb} élément(s) à traiter`, htmlBody: html,
    body: `${aRappeler.length} essai(s) à rappeler, ${prevus.length} essai(s) prévu(s), ${resas.length} réservation(s) non payée(s). Ouvrez le Google Sheet : ${ss.getUrl()}` });
  if (manuel === true) try { ss.toast('Récapitulatif envoyé à ' + REGLAGES.EMAIL_ECOLE); } catch (_) {}
  return true;
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🌐 Site Coding Host')
    .addItem('Mettre à jour la galerie maintenant', 'rafraichirGalerieMenu')
    .addItem('Mettre à jour les stages maintenant', 'viderCacheStages')
    .addSeparator()
    .addItem('Réparer les photos qui ne s\'affichent pas', 'reparerPhotos')
    .addSeparator()
    .addItem('Envoyer le récapitulatif du jour maintenant', 'recapMaintenant')
    .addToUi();
}
function onEdit() { CacheService.getScriptCache().remove('stages'); }
/** À lancer depuis l'éditeur (▷ Exécuter) : envoie un email de test et dit ce qui bloque. */
function testerEmails() {
  const moi = Session.getEffectiveUser().getEmail();
  const reste = MailApp.getRemainingDailyQuota();
  console.log('Script exécuté par le compte : ' + moi);
  console.log('Emails encore autorisés aujourd\'hui : ' + reste);
  console.log('Adresse de l\'école (EMAIL_ECOLE) : ' + REGLAGES.EMAIL_ECOLE);
  if (reste < 1) { console.error('❌ Quota d\'emails du jour épuisé (Google limite à 100/jour pour un compte Gmail). Réessayez demain.'); return; }
  MailApp.sendEmail({ to: REGLAGES.EMAIL_ECOLE, name: REGLAGES.NOM_ECOLE, subject: '✅ Test : les emails du site fonctionnent',
    body: 'Si vous lisez ce message, le site peut vous envoyer les réservations, les demandes d\'essai et le récapitulatif du matin.\n\nVersion du script : ' + VERSION });
  console.log('✅ Email de test envoyé à ' + REGLAGES.EMAIL_ECOLE + '. Regardez la boîte de réception, le dossier Spam' + (moi.toLowerCase() === String(REGLAGES.EMAIL_ECOLE).toLowerCase() ? ' et « Messages envoyés » (vous vous écrivez à vous-même).' : '.'));
  const rappel = ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'rappelQuotidien');
  console.log(rappel ? '✅ Le récapitulatif du matin est activé.' : '⚠️ Le récapitulatif du matin n\'est PAS activé : lancez la fonction activerRappelQuotidien.');
}

function recapMaintenant() { rappelQuotidien(true); }
function viderCacheStages() { CacheService.getScriptCache().remove('stages'); SpreadsheetApp.getActive().toast('Les stages sont à jour sur le site.'); }
function rafraichirGalerieMenu() { const a = rafraichirGalerie(); SpreadsheetApp.getActive().toast(a.length + ' albums publiés sur le site.'); }

/* ═════════ Outils ═════════ */
function feuille_(nom, entetes) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(nom);
  if (!sh) { sh = ss.insertSheet(nom); sh.appendRow(entetes); }
  return sh;
}
function propre_(v) { return String(v == null ? '' : v).replace(/^[=+\-@]/, "'$&").slice(0, 1000); }
function jourCourt_(iso) { const d = new Date(iso + 'T12:00:00Z'); return JOURS[d.getUTCDay()] + ' ' + ('0' + d.getUTCDate()).slice(-2) + '/' + ('0' + (d.getUTCMonth() + 1)).slice(-2); }
function dateIso_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const m = String(v || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : String(v || '');
}
function urlImage_(v) {
  const m = v.match(/(?:\/d\/|id=)([\w-]{20,})/);
  // Image d'un stage déposée dans Drive : on la rend visible au public automatiquement (une fois)
  if (m && REGLAGES.PARTAGE_AUTO) {
    const c = CacheService.getScriptCache();
    if (!c.get('partage_' + m[1])) { try { partager_(DriveApp.getFileById(m[1])); } catch (_) {} c.put('partage_' + m[1], '1', 21600); }
  }
  return m ? 'https://lh3.googleusercontent.com/d/' + m[1] + '=w1200' : v;
}
// Le cache Google est limité à 100 Ko par entrée : on découpe
function putGros_(k, s, ttl) {
  const c = CacheService.getScriptCache(), n = Math.ceil(s.length / 90000), o = {};
  for (let i = 0; i < n; i++) o[k + '_' + i] = s.substr(i * 90000, 90000);
  o[k + '_n'] = String(n);
  c.putAll(o, ttl);
}
function getGros_(k) {
  const c = CacheService.getScriptCache(), n = Number(c.get(k + '_n'));
  if (!n) return null;
  const keys = []; for (let i = 0; i < n; i++) keys.push(k + '_' + i);
  const v = c.getAll(keys); let s = '';
  for (const key of keys) { if (v[key] == null) return null; s += v[key]; }
  return s;
}
