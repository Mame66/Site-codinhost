/* ═══════════════════════════════════════════════════════════
   RÉGLAGES DU SITE — le seul fichier à modifier (une seule fois)
   ═══════════════════════════════════════════════════════════ */
window.SITE_CONFIG = {

  // Adresse de votre « Google Apps Script » (voir GUIDE.md, étape 3).
  // Tant qu'elle est vide, le site affiche les stages du fichier data/exemple.json.
  API_URL: "https://script.google.com/macros/s/AKfycbzzDKiQFyjyX7TxcxtxfDUpZJ5Jph1NZTeAB6mUbu4Jsbb_PonvOfzkR5Nd0HEzGLfwKA/exec",

  // Liens de paiement Stripe (un « Payment Link » par montant, créés une fois dans votre tableau de bord Stripe).
  // Utilisés seulement tant que API_URL est vide : ensuite ce sont ceux du Google Apps Script.
  LIENS_PAIEMENT: {
    semaine: "https://buy.stripe.com/LIEN-185",
    "1": "https://buy.stripe.com/LIEN-50",
    "2": "https://buy.stripe.com/LIEN-100",
    "3": "https://buy.stripe.com/LIEN-150"
  },

  // Page « Essai gratuit » du site (les demandes arrivent dans l'onglet « Essais » du Google Sheet)
  ESSAI_GRATUIT_URL: "essai.html",

  TELEPHONE: "06 21 68 09 20",
  EMAIL: "codinghost2025@gmail.com"
};
