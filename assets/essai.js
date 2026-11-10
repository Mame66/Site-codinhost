/* ═══════════════════════════════════════════════════════════
   Page « Essai gratuit » — choix du cours, du créneau et de la date
   Pour changer un horaire : modifiez la liste COURS ci-dessous.
   Jours : 1 = lundi, 2 = mardi, 3 = mercredi, 4 = jeudi, 5 = vendredi, 6 = samedi
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const COURS = [
    // ── Programmation enfants ──
    { id: "junior-scratch", pour: "enfant", nom: "Junior Scratch", min: 6, max: 8, creneaux: [{ j: 3, h: "9h00 – 10h00" }, { j: 6, h: "9h00 – 10h00" }] },
    { id: "visio", pour: "enfant", nom: "Visio — Scratch", min: 8, max: 11, creneaux: [{ j: 6, h: "10h30 – 12h00" }] },
    { id: "crafto", pour: "enfant", nom: "Crafto — Minecraft", min: 8, max: 12, creneaux: [{ j: 3, h: "10h30 – 12h00" }, { j: 6, h: "15h00 – 16h30" }] },
    { id: "gameo", pour: "enfant", nom: "Gameo — Création de jeux", min: 9, max: 12, creneaux: [{ j: 3, h: "13h00 – 14h30" }, { j: 6, h: "13h00 – 14h30" }] },
    { id: "roblox", pour: "enfant", nom: "Roblox Studio", min: 10, max: 14, creneaux: [] },
    { id: "unity", pour: "enfant", nom: "Unity — Jeux 3D", min: 11, max: 15, creneaux: [{ j: 6, h: "17h00 – 18h30" }] },
    { id: "pyro", pour: "enfant", nom: "Python — débutant", min: 12, max: 16, creneaux: [{ j: 3, h: "15h00 – 16h30" }, { j: 3, h: "17h00 – 18h30" }] },
    { id: "pyro-en-ligne", pour: "enfant", nom: "Python en ligne (visio)", min: 12, max: 16, creneaux: [{ j: 6, h: "17h00 · débutant" }, { j: 4, h: "18h00 · avancé" }, { j: 3, h: "17h30 · pro" }] },
    // ── Adultes ──
    { id: "python-ia", pour: "adulte", nom: "Python & IA", creneaux: [{ j: 2, h: "19h00 – 21h00" }, { j: 4, h: "19h00 – 21h00" }] },
    { id: "cours-du-soir", pour: "adulte", nom: "Cours du soir Python", creneaux: [{ j: 2, h: "19h00 – 21h00" }, { j: 4, h: "19h00 – 21h00" }] },
    { id: "python-intensif", pour: "adulte", nom: "Python intensif (1 semaine)", creneaux: [] },
    { id: "bureautique", pour: "adulte", nom: "Bureautique (Word, Excel, PowerPoint)", creneaux: [] },
    { id: "toolkits", pour: "adulte", nom: "Toolkits pour managers", creneaux: [] },
    // ── Anglais ──
    { id: "anglais-5-7", pour: "anglais", nom: "Anglais Kids 5 – 7 ans", min: 5, max: 7, creneaux: [{ j: 1, h: "17h00 – 18h00" }, { j: 2, h: "17h00 – 18h00" }] },
    { id: "anglais-8-12", pour: "anglais", nom: "Anglais Kids 8 – 12 ans", min: 8, max: 12, creneaux: [{ j: 1, h: "18h10 – 19h10" }, { j: 2, h: "18h10 – 19h10" }] },
    { id: "anglais-adultes-deb", pour: "anglais", nom: "Anglais adultes & ados 14+ · débutant", min: 14, max: 99, creneaux: [{ j: 4, h: "18h00 – 19h30" }, { j: 5, h: "18h00 – 19h30" }] },
    { id: "anglais-adultes-int", pour: "anglais", nom: "Anglais adultes & ados 14+ · intermédiaire", min: 14, max: 99, creneaux: [{ j: 4, h: "19h40 – 21h10" }, { j: 5, h: "19h40 – 21h10" }] },
    { id: "business-english", pour: "anglais", nom: "Business English", min: 16, max: 99, creneaux: [] }
  ];
  const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const CFG = window.SITE_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const form = $("#essaiForm");
  if (!form) return;

  /* Jours fériés (pas de cours d'essai ces jours-là) */
  function feries(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    const p = new Date(y, mo - 1, da), add = (n) => { const x = new Date(p); x.setDate(x.getDate() + n); return x; };
    return [new Date(y, 0, 1), add(1), new Date(y, 4, 1), new Date(y, 4, 8), add(39), add(50), new Date(y, 6, 14), new Date(y, 7, 15), new Date(y, 10, 1), new Date(y, 10, 11), new Date(y, 11, 25)].map((x) => x.toDateString());
  }
  function prochainesDates(jour, n) {
    const out = [], d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + 2); // au plus tôt dans 2 jours
    while (out.length < n) {
      if (d.getDay() === jour && !feries(d.getFullYear()).includes(d.toDateString())) out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const joli = (d) => { const t = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); return t.charAt(0).toUpperCase() + t.slice(1); };

  let pour = "enfant";
  const blocks = { enfantInfos: $("#bEnfant"), age: $("#e-age"), cours: $("#e-cours"), creneaux: $("#bCreneaux"), dates: $("#bDates") };

  function majPour(p) {
    pour = p;
    $$("input[name=pour]", form).forEach((r) => (r.checked = r.value === p));
    blocks.enfantInfos.hidden = p === "adulte";
    $("#lblNom").textContent = p === "adulte" ? "Votre nom *" : "Nom du parent *";
    $("#lblEnfant").textContent = p === "anglais" ? "Prénom de l'élève *" : "Prénom de l'enfant *";
    form.enfant.required = p !== "adulte"; form.age.required = p !== "adulte";
    majCours();
  }
  function majCours() {
    const age = Number(form.age.value) || 0, prev = form.cours.value;
    const liste = COURS.filter((c) => c.pour === pour);
    const ok = (c) => !age || c.min == null || (age >= c.min && age <= c.max);
    const conseilles = liste.filter(ok), autres = liste.filter((c) => !ok(c));
    form.cours.innerHTML = '<option value="">' + (pour === "adulte" ? "Choisir une formation…" : "Choisir un cours…") + "</option>" +
      (conseilles.length ? `<optgroup label="${age ? "Conseillés pour " + age + " ans" : "Nos cours"}">${conseilles.map((c) => `<option value="${c.id}">${esc(c.nom)}${c.min != null && c.max < 99 ? " · " + c.min + "–" + c.max + " ans" : ""}</option>`).join("")}</optgroup>` : "") +
      (age && autres.length ? `<optgroup label="Autres cours">${autres.map((c) => `<option value="${c.id}">${esc(c.nom)}${c.min != null && c.max < 99 ? " · " + c.min + "–" + c.max + " ans" : ""}</option>`).join("")}</optgroup>` : "") +
      '<option value="conseil">Je ne sais pas, conseillez-moi</option>';
    if (prev && $$("option", form.cours).some((o) => o.value === prev)) form.cours.value = prev;
    majCreneaux();
  }
  function majCreneaux() {
    const c = COURS.find((x) => x.id === form.cours.value);
    blocks.dates.innerHTML = ""; blocks.dates.hidden = true;
    if (!c) { blocks.creneaux.hidden = form.cours.value !== "conseil"; blocks.creneaux.innerHTML = form.cours.value === "conseil" ? '<p class="hint"><i class="bi bi-chat-heart"></i> Pas de souci ! Nous vous appelons pour trouver ensemble le cours et le créneau idéals.</p>' : ""; return; }
    blocks.creneaux.hidden = false;
    if (!c.creneaux.length) { blocks.creneaux.innerHTML = '<p class="hint"><i class="bi bi-telephone"></i> Créneaux à convenir : nous vous appelons pour fixer la date ensemble.</p>'; return; }
    blocks.creneaux.innerHTML = '<label class="lbl">Créneau souhaité *</label><div class="formules">' +
      c.creneaux.map((s, i) => `<label class="opt"><input type="radio" name="creneau" value="${i}" required ${c.creneaux.length === 1 ? "checked" : ""}><span><b>${JOURS[s.j].charAt(0).toUpperCase() + JOURS[s.j].slice(1)}</b>${esc(s.h)}</span></label>`).join("") + "</div>";
    if (c.creneaux.length === 1) majDates();
  }
  function majDates() {
    const c = COURS.find((x) => x.id === form.cours.value), r = $("input[name=creneau]:checked", form);
    if (!c || !r) return;
    const s = c.creneaux[Number(r.value)];
    blocks.dates.hidden = false;
    blocks.dates.innerHTML = '<label class="lbl">Date de l\'essai *</label><div class="dates">' +
      prochainesDates(s.j, 4).map((d, i) => `<label class="opt date"><input type="radio" name="date" value="${iso(d)}" required ${i === 0 ? "checked" : ""}><span><b>${joli(d)}</b>${esc(s.h)}</span></label>`).join("") +
      '</div><p class="hint small">Nous vous confirmons la date par téléphone ou SMS (pas de cours pendant les vacances scolaires).</p>';
  }

  form.addEventListener("change", (e) => {
    if (e.target.name === "pour") majPour(e.target.value);
    else if (e.target.name === "cours") majCreneaux();
    else if (e.target.name === "creneau") majDates();
  });
  form.age.addEventListener("input", majCours);

  // Pré-remplissage depuis un bouton « Essai gratuit » d'un cours (essai.html?cours=gameo)
  const q = new URLSearchParams(location.search), qc = COURS.find((c) => c.id === q.get("cours"));
  majPour(qc ? qc.pour : q.get("pour") || "enfant");
  if (qc) { form.cours.value = qc.id; majCreneaux(); }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.website.value) return;
    const msg = $("#essaiMsg"), btn = $("button[type=submit]", form);
    const c = COURS.find((x) => x.id === form.cours.value);
    const r = $("input[name=creneau]:checked", form), dd = $("input[name=date]:checked", form);
    const s = c && r ? c.creneaux[Number(r.value)] : null;
    const p = {
      type: "essai", pour: { enfant: "Enfant — programmation", adulte: "Adulte", anglais: "Anglais" }[pour],
      enfant: pour === "adulte" ? "" : form.enfant.value.trim(), age: pour === "adulte" ? "" : form.age.value,
      cours: c ? c.nom : "À conseiller", creneau: s ? JOURS[s.j] + " " + s.h : "À convenir",
      date: dd ? dd.value : "", dateTexte: dd ? joli(new Date(dd.value + "T12:00:00")) : "À convenir",
      nom: form.nom.value.trim(), telephone: form.telephone.value.trim(), email: form.email.value.trim(),
      source: form.source.value, message: form.message.value.trim()
    };
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Envoi…';
    try {
      if (CFG.API_URL) {
        let d;
        try {
          const res = await fetch(CFG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(p) });
          d = await res.json();
        } catch (netErr) { throw new Error("reseau"); }
        if (!d.ok) throw new Error(d.error || "inconnu");
      } else {
        const body = Object.entries(p).filter(([k]) => k !== "type" && k !== "date").map(([k, v]) => k + " : " + v).join("\n");
        window.location.href = `mailto:${CFG.EMAIL}?subject=${encodeURIComponent("Cours d'essai — " + (p.enfant || p.nom))}&body=${encodeURIComponent(body)}`;
      }
      form.hidden = true;
      $("#essaiDone").hidden = false;
      $("#essaiRecap").innerHTML = `<div><b>${esc(p.cours)}</b>${p.enfant ? " pour " + esc(p.enfant) + (p.age ? " (" + esc(p.age) + " ans)" : "") : ""}</div><div>${esc(p.dateTexte)}${s ? " · " + esc(s.h) : ""}</div>`;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      msg.className = "form-msg err";
      msg.textContent = "L'envoi n'a pas fonctionné. Réessayez ou appelez-nous au " + (CFG.TELEPHONE || "") + ".";
      // Détail technique (pour vous aider à corriger)
      const raison = err.message === "type" ? "le script Google en ligne est une ancienne version : publiez une « Nouvelle version » dans Apps Script."
        : err.message === "reseau" ? "Google ne répond pas (connexion, ou déploiement « Qui a accès » différent de « Tout le monde »)."
        : err.message;
      console.warn("Essai gratuit — erreur :", raison);
      const det = document.createElement("small"); det.style.cssText = "display:block;margin-top:6px;opacity:.75";
      det.textContent = "Détail : " + raison; msg.appendChild(det);
    }
    btn.disabled = false; btn.innerHTML = '<i class="bi bi-send"></i> Réserver mon cours d\'essai gratuit';
  });
})();
