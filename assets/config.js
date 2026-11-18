/* ═══════════════════════════════════════════════════════════
   RÉGLAGES DU SITE — le seul fichier à modifier (une seule fois)
   ═══════════════════════════════════════════════════════════ */
window.SITE_CONFIG = {

  // Adresse de votre « Google Apps Script » (voir GUIDE.md, étape 3).
  // Tant qu'elle est vide, le site affiche les stages du fichier data/exemple.json.
  API_URL: "https://script.google.com/macros/s/AKfycbzzDKiQFyjyX7TxcxtxfDUpZJ5Jph1NZTeAB6mUbu4Jsbb_PonvOfzkR5Nd0HEzGLfwKA/exec",

  // Liens de paiement Stripe, rangés PAR MONTANT (un Payment Link Stripe a un montant fixe).
  // Utilisés seulement tant que API_URL est vide : ensuite ce sont ceux du Google Apps Script.
  LIENS_PAIEMENT: {
    "50": "https://buy.stripe.com/cNi4gAdmzfKn9m371f4800q",
    "100": "https://buy.stripe.com/14A9AUfuH2XBgOvbhv4800r",
    "185": "https://buy.stripe.com/eVqeVegyLbu71TBadr4800t",
    "199": "https://buy.stripe.com/bJefZi96j69N9m399n4800s"
  },

  // Page « Essai gratuit » du site (les demandes arrivent dans l'onglet « Essais » du Google Sheet)
  ESSAI_GRATUIT_URL: "essai.html",

  TELEPHONE: "06 21 68 09 20",
  EMAIL: "codinghost2025@gmail.com"
};
