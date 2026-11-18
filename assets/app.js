/* ═══════════════════════════════════════════════════════════
   CODING HOST ACADÉMIE — app.js (toutes les pages)
   Rien à modifier ici : les réglages sont dans config.js
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const CFG = window.SITE_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ─── Menu mobile ─── */
  const burger = $(".nav-burger"), links = $(".nav-links");
  burger && burger.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    burger.setAttribute("aria-expanded", open);
    burger.innerHTML = open ? '<i class="bi bi-x-lg"></i>' : '<i class="bi bi-list"></i>';
  });

  /* ─── Liens « essai gratuit » centralisés ─── */
  $$("[data-essai]").forEach((a) => {
    const u = CFG.ESSAI_GRATUIT_URL || "essai.html";
    a.href = u;
    if (/^https?:/.test(u)) { a.target = "_blank"; a.rel = "noopener"; }
  });

  /* ─── Vidéos de l'accueil (reels en boucle) ───
     Déposez vos vidéos dans le dossier videos/ en les nommant accueil-1.mp4, accueil-2.mp4 … (jusqu'à 6).
     Elles passent l'une après l'autre, sans le son. S'il n'y en a aucune, la photo reste affichée. */
  const heroBox = $("[data-hero-videos]");
  if (heroBox) {
    const vid = $("video", heroBox), img = $("img", heroBox), ctrl = $(".video-ctrl", heroBox);
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches || (navigator.connection && navigator.connection.saveData);
    const MAX = 6, manquantes = new Set();
    let i = 1;
    const charger = (n) => { i = n; vid.src = "videos/accueil-" + n + ".mp4"; vid.load(); };
    const prochaine = (from) => { for (let k = 1; k <= MAX; k++) { const n = ((from - 1 + k) % MAX) + 1; if (!manquantes.has(n)) return n; } return null; };
    vid.addEventListener("loadeddata", () => {
      vid.hidden = false; ctrl.hidden = false; img.style.opacity = 0;
      vid.play().catch(() => {});
    });
    vid.addEventListener("error", () => {
      manquantes.add(i); // pas de vidéo à ce numéro : on passe à la suivante
      const n = prochaine(i);
      if (n == null) { vid.removeAttribute("src"); vid.hidden = true; ctrl.hidden = true; img.style.opacity = 1; return; }
      charger(n);
    });
    vid.addEventListener("ended", () => { const n = prochaine(i); if (n === i) { vid.currentTime = 0; vid.play(); } else charger(n); });
    ctrl.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.v === "son") { vid.muted = !vid.muted; b.innerHTML = vid.muted ? '<i class="bi bi-volume-mute-fill"></i>' : '<i class="bi bi-volume-up-fill"></i>'; b.setAttribute("aria-label", vid.muted ? "Activer le son" : "Couper le son"); }
      else { if (vid.paused) { vid.play(); b.innerHTML = '<i class="bi bi-pause-fill"></i>'; } else { vid.pause(); b.innerHTML = '<i class="bi bi-play-fill"></i>'; } }
    });
    if (!calme) charger(1);
  }

  /* ─── Programmes PDF pas encore déposés : bouton « bientôt disponible » ─── */
  if (location.protocol.startsWith("http")) $$("[data-programme]").forEach((a) => {
    fetch(a.getAttribute("href"), { method: "HEAD" }).then((r) => {
      if (r.ok) return;
      a.removeAttribute("href"); a.removeAttribute("target");
      a.classList.add("soon"); a.title = "Le programme détaillé sera bientôt disponible. Demandez-le-nous !";
      a.innerHTML = '<i class="bi bi-hourglass-split"></i> Programme bientôt';
      a.addEventListener("click", () => (location.href = "contact.html?sujet=" + encodeURIComponent("Programme du cours")));
    }).catch(() => {});
  });

  /* ─── Apparition au défilement ─── */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    $$(".reveal").forEach((el) => io.observe(el));
  } else $$(".reveal").forEach((el) => el.classList.add("in"));

  /* ─── Filtres de cours par âge ─── */
  $$("[data-filter-group]").forEach((group) => {
    const target = $(group.dataset.filterGroup);
    group.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip"); if (!chip) return;
      $$(".chip", group).forEach((c) => c.classList.toggle("on", c === chip));
      const f = chip.dataset.f;
      $$("[data-tags]", target).forEach((card) => { card.style.display = f === "all" || card.dataset.tags.split(" ").includes(f) ? "" : "none"; });
    });
  });

  /* ═══════════ Données (Google Drive / Sheet ou exemples) ═══════════ */
  /* Chargement « instantané » : on affiche tout de suite la dernière version gardée dans le navigateur,
     puis on la remplace par la version fraîche de Google dès qu'elle arrive (cb peut donc être appelé 2 fois). */
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };
  const pending = {};
  function fetchAction(action) {
    if (pending[action]) return pending[action];
    const demo = () => fetch("data/exemple.json").then((r) => r.json()).then((d) => ({ ...d, demo: true })).catch(() => ({ stages: [], albums: [], demo: true }));
    if (!CFG.API_URL) return (pending[action] = demo());
    return (pending[action] = fetch(CFG.API_URL + (CFG.API_URL.includes("?") ? "&" : "?") + "action=" + action)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => { if (d.error) throw new Error(d.error); store.set("ch_" + action, { t: Date.now(), d }); return d; }));
  }
  function loadData(action, cb) {
    const key = "ch_" + action, cached = CFG.API_URL ? store.get(key) : null;
    let shown = null;
    if (cached && cached.d && Date.now() - cached.t < 7 * 864e5) { shown = JSON.stringify(cached.d); cb(cached.d); }
    fetchAction(action).then((d) => { if (JSON.stringify(d) !== shown) cb(d); })
      .catch((err) => { console.warn("Google ne répond pas :", err); if (!shown) fetch("data/exemple.json").then((r) => r.json()).then((d) => cb({ ...d, demo: true })).catch(() => cb({ stages: [], albums: [] })); });
  }

  /* Photo qui ne charge pas : on réessaie avec une autre adresse Google, sinon on la masque */
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const id = img.dataset.id;
    if (id && !img.dataset.retry) { img.dataset.retry = 1; img.src = "https://drive.google.com/thumbnail?id=" + id + "&sz=w800"; return; }
    if (img.closest(".album .cover, .stage .img")) { img.style.display = "none"; return; }
    const box = img.closest("#albumGrid > button, .teaser-grid > a");
    if (box) box.style.display = "none";
  }, true);

  /* ─── Dates ─── */
  const parseD = (s) => { if (!s) return null; const d = new Date(s.length === 10 ? s + "T12:00:00" : s); return isNaN(d) ? null : d; };
  const fmt = (d, o) => d.toLocaleDateString("fr-FR", o);
  function dateRange(a, b) {
    const d1 = parseD(a), d2 = parseD(b);
    if (!d1) return "";
    if (!d2 || d1.toDateString() === d2.toDateString()) return fmt(d1, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const same = d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    return "Du " + fmt(d1, same ? { weekday: "short", day: "numeric" } : { weekday: "short", day: "numeric", month: "short" }) + " au " + fmt(d2, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  /* ═══════════ STAGES ═══════════ */
  const euro = (v) => { const s = String(v == null ? "" : v).trim(); return s ? (/€/.test(s) ? s : s + " €") : ""; };
  // Jours d'un stage (hors week-end), format 2026-12-21
  function stageDays(s) {
    const out = [], a = parseD(s.dateDebut), b = parseD(s.dateFin || s.dateDebut);
    if (!a) return out;
    for (const d = new Date(a); d <= b && out.length < 31; d.setDate(d.getDate() + 1))
      if (d.getDay() !== 0 && d.getDay() !== 6) out.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"));
    return out;
  }
  const periodIcon = (p) => /no[eë]l/i.test(p) ? "gift" : /hiver/i.test(p) ? "snow2" : /printemps/i.test(p) ? "flower1" : /[ée]t[ée]/i.test(p) ? "sun" : /toussaint/i.test(p) ? "tree" : "stars";
  const dayLabel = (iso) => { const t = fmt(parseD(iso), { weekday: "long", day: "numeric", month: "short" }); return t.charAt(0).toUpperCase() + t.slice(1); };
  function placesHtml(s) {
    const tot = Number(s.places) || 0;
    if (!tot) return "";
    const left = Math.max(0, Number(s.restantes != null ? s.restantes : tot));
    const pct = Math.round(((tot - left) / tot) * 100);
    const cls = left === 0 ? "full" : left <= 3 ? "low" : "ok";
    const txt = left === 0 ? "Complet" : left === 1 ? "Dernière place !" : left <= 3 ? `Plus que ${left} places` : `${left} places disponibles`;
    return `<div class="places ${cls}"><span>${txt}</span><div class="bar"><span style="width:${Math.max(pct, 4)}%"></span></div></div>`;
  }
  function stageCard(s) {
    const left = s.restantes != null ? Number(s.restantes) : Number(s.places) || 1;
    const parJour = s.restantesParJour || {};
    const someDayFree = Object.keys(parJour).some((k) => parJour[k] > 0);
    const full = Number(s.places) > 0 && left <= 0 && !(s.prixJour && someDayFree);
    const did = (String(s.image || "").match(/\/d\/([\w-]{20,})/) || [])[1] || "";
    const img = '<i class="bi bi-controller"></i>' + (s.image ? `<a href="${esc(s.image)}" target="_blank" rel="noopener" title="Voir l'affiche"><img src="${esc(s.image)}" data-id="${esc(did)}" alt="${esc(s.periode + " — " + s.titre)}" loading="lazy"></a>` : "");
    const prog = (s.programme || []).length ? `<ul class="prog">${s.programme.map((p) => { const m = String(p).split(/\s*:\s*/); return m.length > 1 ? `<li><b>${esc(m[0])}</b>${esc(m.slice(1).join(" : "))}</li>` : `<li>${esc(p)}</li>`; }).join("")}</ul>` : "";
    return `<article class="stage">
      <div class="img">${img}${s.exemple ? '<span class="badge">Exemple</span>' : s.periode ? `<span class="badge"><i class="bi bi-${periodIcon(s.periode)}"></i> ${esc(s.periode)}</span>` : ""}</div>
      <div class="body">
        <h3>${esc(s.titre)}</h3>
        ${s.theme ? `<div class="theme">${esc(s.theme)}</div>` : ""}
        <div class="facts">
          <div><i class="bi bi-calendar-event"></i><span>${esc(dateRange(s.dateDebut, s.dateFin))}</span></div>
          ${s.horaires ? `<div><i class="bi bi-clock"></i><span>${esc(s.horaires)}</span></div>` : ""}
          ${s.ages ? `<div><i class="bi bi-person"></i><span>${esc(s.ages)}</span></div>` : ""}
          ${s.lieu ? `<div><i class="bi bi-geo-alt"></i><span>${esc(s.lieu)}</span></div>` : ""}
        </div>
        ${prog}
        ${s.description ? `<p class="desc">${esc(s.description)}</p>` : ""}
        ${placesHtml(s)}
        <div class="bottom">
          <div class="price">${esc(euro(s.prix))}<small>${s.prixJour ? "la semaine · ou " + esc(euro(s.prixJour)) + " / jour" : "par enfant"}</small></div>
          ${full ? `<a class="btn btn-ghost btn-sm" href="contact.html?sujet=${encodeURIComponent("Liste d'attente : " + (s.periode ? s.periode + " — " : "") + s.titre)}">Liste d'attente</a>`
                 : `<button class="btn btn-yellow" data-book="${esc(s.id)}"><i class="bi bi-ticket-perforated"></i> Réserver</button>`}
        </div>
      </div></article>`;
  }
  const emptyStages = `<div class="empty"><i class="bi bi-calendar-heart"></i><b>Les prochains stages arrivent bientôt !</b><br>Laissez-nous votre email pour être prévenu en premier.<br><br><a class="btn btn-blue btn-sm" href="contact.html?sujet=${encodeURIComponent("Prévenez-moi des prochains stages")}">Être prévenu</a></div>`;

  const stageBoxes = $$("[data-stages]");
  let STAGES = [];
  if (stageBoxes.length) {
    stageBoxes.forEach((b) => (b.innerHTML = '<div class="skeleton"></div>'.repeat(Math.min(Number(b.dataset.stages) || 3, 3))));
    loadData("stages", (d) => {
      // Un stage dont la date de fin est passée disparaît automatiquement
      const today = new Date(); today.setHours(0, 0, 0, 0);
      STAGES = (d.stages || []).filter((s) => { const end = parseD(s.dateFin || s.dateDebut); return !end || end >= today; })
        .sort((a, b) => (parseD(a.dateDebut) || 0) - (parseD(b.dateDebut) || 0));
      stageBoxes.forEach((box) => {
        const lim = Number(box.dataset.stages) || 999;
        const list = STAGES.slice(0, lim);
        if (!list.length) { box.innerHTML = emptyStages; return; }
        if ("group" in box.dataset) { // page Stages : regroupés par période (Stage de Noël 2026, Stage d'hiver 2027…)
          const groups = [];
          list.forEach((s) => {
            const key = (s.periode || "Stages vacances") + " " + ((parseD(s.dateDebut) || new Date()).getFullYear());
            let g = groups.find((x) => x.key === key); if (!g) groups.push((g = { key, items: [] }));
            g.items.push(s);
          });
          box.classList.remove("stages");
          box.innerHTML = groups.map((g) => `<div class="stage-group"><h3 class="group-title"><i class="bi bi-stars"></i> ${esc(g.key)}</h3><div class="stages">${g.items.map(stageCard).join("")}</div></div>`).join("");
        } else box.innerHTML = list.map(stageCard).join("");
      });
      $$("[data-demo-note]").forEach((n) => (n.hidden = !(d.demo && STAGES.some((s) => s.exemple))));
      if (!stageBoxes.hashDone) { stageBoxes.hashDone = true; openFromHash(); }
    });
  }

  /* ─── Modale de réservation ─── */
  const modal = $("#bookModal");
  let CUR = null;
  function updateTotal() {
    const f = $("#bookForm"), s = CUR; if (!s) return;
    const box = $("#bookDays"), tot = $("#bookTotal");
    if (!box) return;
    const perDay = f.formule && f.formule.value === "jours";
    box.hidden = !perDay;
    const days = $$("input[name=jour]:checked", f).length, all = stageDays(s).length;
    let t = Number(s.prix) || 0, txt = "Semaine complète";
    if (perDay) { t = days * (Number(s.prixJour) || 0); txt = days + " jour" + (days > 1 ? "s" : ""); if (days && days === all && Number(s.prix)) { t = Number(s.prix); txt = "Semaine complète"; } }
    tot.innerHTML = `Total : <b>${t} €</b> <span>(${txt})</span>`;
  }
  function openBooking(id) {
    const s = STAGES.find((x) => String(x.id) === String(id));
    if (!s || !modal) return;
    CUR = s;
    $("#bookTitle").textContent = (s.periode ? s.periode + " — " : "") + s.titre;
    $("#bookRecap").innerHTML = `<div><b>${esc(s.titre)}</b>${s.theme ? " — " + esc(s.theme) : ""}</div><div>${esc(dateRange(s.dateDebut, s.dateFin))}${s.horaires ? " · " + esc(s.horaires) : ""}</div><div>${esc(s.ages || "")}${s.lieu ? " · " + esc(s.lieu) : ""}</div>`;
    const f = $("#bookForm"); f.reset(); f.stageId.value = s.id; f.hidden = false;
    // Formule : semaine ou à la journée
    const fb = $("#bookFormule");
    const parJour = s.restantesParJour || {}, today = new Date(); today.setHours(0, 0, 0, 0);
    const days = stageDays(s);
    const weekFull = Number(s.places) > 0 && Number(s.restantes) <= 0;
    const started = days.length && parseD(days[0]) < today;
    if (s.prixJour && days.length > 1) {
      fb.innerHTML = `<div class="field"><label>Formule *</label><div class="formules">
          <label class="opt"><input type="radio" name="formule" value="semaine" ${weekFull || started ? "disabled" : "checked"}><span><b>Semaine complète</b>${esc(euro(s.prix))}${weekFull ? " · complet" : started ? " · déjà commencé" : ""}</span></label>
          <label class="opt"><input type="radio" name="formule" value="jours" ${weekFull || started ? "checked" : ""}><span><b>À la journée</b>${esc(euro(s.prixJour))} / jour</span></label>
        </div></div>
        <div class="field" id="bookDays"><label>Choisissez les jours *</label><div class="days">${days.map((iso, i) => {
          const off = (parJour[iso] != null && parJour[iso] <= 0) || parseD(iso) < today;
          const p = (s.programme || [])[i]; const what = p ? String(p).split(/\s*:\s*/).slice(1).join(" : ") || p : "";
          return `<label class="opt day ${off ? "off" : ""}"><input type="checkbox" name="jour" value="${iso}" ${off ? "disabled" : ""}><span><b>${esc(dayLabel(iso))}</b>${esc(what)}${off ? " · complet" : ""}</span></label>`;
        }).join("")}</div></div>
        <div class="total" id="bookTotal"></div>`;
      fb.onchange = updateTotal; updateTotal();
    } else fb.innerHTML = `<div class="total">Total : <b>${esc(euro(s.prix))}</b></div>`;
    $("#bookDone").hidden = true; $("#bookMsg").className = "form-msg";
    modal.classList.add("open"); document.body.style.overflow = "hidden";
    setTimeout(() => f.enfant.focus(), 50);
  }
  function closeModal() { modal.classList.remove("open"); document.body.style.overflow = ""; }
  function openFromHash() { const m = location.hash.match(/^#reserver-(.+)$/); if (m) openBooking(decodeURIComponent(m[1])); }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-book]");
    if (b) { if (modal) openBooking(b.dataset.book); else location.href = "stages.html#reserver-" + encodeURIComponent(b.dataset.book); }
    if (e.target.closest("[data-close]") || e.target === modal) closeModal();
  });

  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-copy]"); if (!c) return;
    const el = $(`[data-rib="${c.dataset.copy}"]`), val = el ? el.textContent : "";
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(c.dataset.copy === "iban" ? val.replace(/\s+/g, "") : val).then(() => {
      c.innerHTML = '<i class="bi bi-check-lg"></i>'; setTimeout(() => (c.innerHTML = '<i class="bi bi-copy"></i>'), 1500);
    }).catch(() => {});
  });

  const bookForm = $("#bookForm");
  bookForm && bookForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = bookForm, msg = $("#bookMsg"), btn = $("button[type=submit]", f);
    if (f.website.value) return; // anti-robot
    const s = CUR || {};
    const all = stageDays(s);
    let formule = f.formule ? f.formule.value : "semaine";
    let jours = formule === "jours" ? $$("input[name=jour]:checked", f).map((x) => x.value) : all;
    if (formule === "jours" && !jours.length) { msg.className = "form-msg err"; msg.textContent = "Choisissez au moins un jour."; return; }
    if (formule === "jours" && jours.length === all.length) formule = "semaine";
    const montant = formule === "semaine" ? Number(s.prix) : jours.length * Number(s.prixJour);
    const modePaiement = (f.modePaiement && f.modePaiement.value) || "carte";
    const payload = {
      type: "reservation", stageId: s.id, formule, jours, modePaiement,
      parent: f.parent.value.trim(), email: f.email.value.trim(), telephone: f.telephone.value.trim(),
      enfant: f.enfant.value.trim(), age: f.age.value.trim(), remarques: f.remarques.value.trim(),
      droitImage: f.droitImage.checked ? "OUI" : "NON"
    };
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Envoi…';
    // Lien Stripe choisi selon le montant (le Google Apps Script renvoie le bon lien ; ceci sert en mode exemple)
    const L = CFG.LIENS_PAIEMENT || {};
    let payUrl = modePaiement === "virement" ? "" : L[String(montant)] || "";
    let rib = null, ref = "";
    try {
      if (CFG.API_URL) {
        const r = await fetch(CFG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
        const d = await r.json();
        if (!d.ok) throw new Error(d.error || "Erreur");
        payUrl = d.payUrl; rib = d.virement; ref = d.ref || "";
      } else {
        // Mode exemple (pas encore relié à Google) : on prépare un email à l'école
        const lines = [`Stage : ${s.periode} — ${s.titre} (${dateRange(s.dateDebut, s.dateFin)})`, `Formule : ${formule === "semaine" ? "semaine complète" : jours.map(dayLabel).join(", ")}`, `Montant : ${montant} €`, `Paiement : ${modePaiement}`, `Enfant : ${payload.enfant} (${payload.age} ans)`, `Parent : ${payload.parent}`, `Téléphone : ${payload.telephone}`, `Email : ${payload.email}`, `Remarques : ${payload.remarques}`, `Droit à l'image : ${payload.droitImage}`];
        window.open(`mailto:${CFG.EMAIL}?subject=${encodeURIComponent("Réservation " + (s.periode || "stage") + " – " + payload.enfant)}&body=${encodeURIComponent(lines.join("\n"))}`);
        if (payUrl && /stripe\.com/.test(payUrl)) payUrl += (payUrl.includes("?") ? "&" : "?") + "prefilled_email=" + encodeURIComponent(payload.email);
      }
      f.hidden = true;
      $("#bookDone").hidden = false;
      $("#bookDoneName").textContent = payload.enfant;
      const pay = $("#payLink"), ribBox = $("#ribBox"), sub = $("#bookDone .sub");
      ribBox.hidden = true; pay.hidden = true; $("#payLater").hidden = true;
      if (modePaiement === "virement") {
        sub.innerHTML = `Dernière étape : faites un virement de <b>${montant} €</b> en indiquant le libellé ci-dessous. La place est confirmée à réception.`;
        if (rib) {
          const v = { titulaire: rib.titulaire, iban: rib.iban, bic: rib.bic, montant: montant + " €", ref };
          $$("[data-rib]", ribBox).forEach((el) => (el.textContent = v[el.dataset.rib] || ""));
          ribBox.hidden = false;
        } else { $("#payLater").hidden = false; $("#payLater").textContent = "Nous vous envoyons notre RIB par email très rapidement."; }
      } else {
        sub.innerHTML = `Dernière étape : réglez <b>${montant} €</b> pour confirmer définitivement la place. Vous recevez aussi un récapitulatif par email.`;
        if (payUrl) { pay.hidden = false; pay.href = payUrl; } else $("#payLater").hidden = false;
      }
    } catch (err) {
      msg.className = "form-msg err";
      msg.textContent = /complet/i.test(err.message) ? "Désolé, un des jours choisis vient d'être complet. Rechargez la page ou contactez-nous." : "Oups, l'envoi n'a pas fonctionné. Réessayez ou appelez-nous au " + (CFG.TELEPHONE || "") + ".";
    } finally { btn.disabled = false; btn.innerHTML = '<i class="bi bi-lock"></i> Réserver'; }
  });

  /* ═══════════ GALERIE ═══════════ */
  let LB = { items: [], i: 0 };
  const lb = $("#lightbox");
  function lbShow() {
    const it = LB.items[LB.i]; if (!it) return;
    $(".stagebox", lb).innerHTML = it.type === "video"
      ? (it.embed ? `<iframe src="${esc(it.embed)}" allow="autoplay; fullscreen" allowfullscreen></iframe>${it.id ? `<a class="lb-open" href="https://drive.google.com/file/d/${esc(it.id)}/view" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i> La vidéo ne se lance pas ? Ouvrir dans Google Drive</a>` : ""}` : `<video src="${esc(it.full)}" controls autoplay playsinline style="max-height:100%"></video>`)
      : `<img src="${esc(it.full || it.thumb)}" data-id="${esc(it.id || "")}" alt="${esc(it.name || "")}">`;
    $(".lb-count", lb).textContent = (LB.i + 1) + " / " + LB.items.length;
  }
  function lbOpen(items, i) { LB = { items, i }; lb.classList.add("open"); document.body.style.overflow = "hidden"; lbShow(); }
  function lbClose() { lb.classList.remove("open"); $(".stagebox", lb).innerHTML = ""; document.body.style.overflow = ""; }
  if (lb) {
    $(".lb-close", lb).onclick = lbClose;
    $(".lb-prev", lb).onclick = () => { LB.i = (LB.i - 1 + LB.items.length) % LB.items.length; lbShow(); };
    $(".lb-next", lb).onclick = () => { LB.i = (LB.i + 1) % LB.items.length; lbShow(); };
    lb.addEventListener("click", (e) => { if (e.target === lb) lbClose(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) { if (e.key === "Escape" && modal) closeModal(); return; }
      if (e.key === "Escape") lbClose(); if (e.key === "ArrowLeft") $(".lb-prev", lb).click(); if (e.key === "ArrowRight") $(".lb-next", lb).click();
    });
  }

  const albumsBox = $("[data-albums]");
  if (albumsBox) {
    const view = $("#albumView"), filters = $("#albumFilters");
    let ALBUMS = [], cat = "Tous";
    const drawAlbums = () => {
      const list = ALBUMS.filter((a) => cat === "Tous" || a.categorie === cat);
      albumsBox.innerHTML = list.length ? list.map((a, i) => {
        const n = a.items.length, v = a.items.filter((x) => x.type === "video").length;
        return `<button class="album" data-album="${ALBUMS.indexOf(a)}"><div class="cover"><img src="${esc(a.cover || (a.items[0] || {}).thumb || "")}" data-id="${esc(a.coverId || (a.items[0] || {}).id || "")}" alt="" loading="lazy" decoding="async"><i class="bi bi-images ph"></i><span class="count"><span><i class="bi bi-image"></i> ${n - v}</span>${v ? `<span><i class="bi bi-play-btn"></i> ${v}</span>` : ""}</span></div><div class="meta"><h3>${esc(a.nom)}</h3><span>${esc(a.categorie || "")}${a.date ? " · " + esc(a.date) : ""}</span></div></button>`;
      }).join("") : '<div class="empty"><i class="bi bi-images"></i>Les premières photos arrivent bientôt.</div>';
    };
    const openAlbum = (idx) => {
      const a = ALBUMS[idx]; if (!a) return;
      albumsBox.hidden = true; filters.hidden = true; view.hidden = false;
      $("#albumTitle").textContent = a.nom;
      $("#albumGrid").innerHTML = a.items.map((it, i) => `<button data-i="${i}" aria-label="Agrandir"><img src="${esc(it.thumb)}" data-id="${esc(it.id || "")}" alt="${esc(a.nom)}" loading="lazy" decoding="async">${it.type === "video" ? '<span class="play"><i class="bi bi-play-circle-fill"></i></span>' : ""}</button>`).join("");
      $("#albumGrid").onclick = (e) => { const b = e.target.closest("button[data-i]"); if (b) lbOpen(a.items, Number(b.dataset.i)); };
      history.replaceState(null, "", "#album-" + idx);
      window.scrollTo({ top: view.offsetTop - 100, behavior: "smooth" });
    };
    $("#albumBack").onclick = () => { view.hidden = true; albumsBox.hidden = false; filters.hidden = false; history.replaceState(null, "", location.pathname); };
    albumsBox.addEventListener("click", (e) => { const b = e.target.closest("[data-album]"); if (b) openAlbum(Number(b.dataset.album)); });
    loadData("albums", (d) => {
      ALBUMS = (d.albums || []).filter((a) => a.items && a.items.length);
      const cats = ["Tous", ...new Set(ALBUMS.map((a) => a.categorie).filter(Boolean))];
      filters.innerHTML = cats.length > 2 ? cats.map((c) => `<button class="chip ${c === cat ? "on" : ""}" data-c="${esc(c)}">${esc(c)}</button>`).join("") : "";
      filters.onclick = (e) => { const c = e.target.closest(".chip"); if (!c) return; cat = c.dataset.c; $$(".chip", filters).forEach((x) => x.classList.toggle("on", x === c)); drawAlbums(); };
      drawAlbums();
      const m = location.hash.match(/^#album-(\d+)/); if (m && !albumsBox.hashDone) { albumsBox.hashDone = true; openAlbum(Number(m[1])); }
    });
  }

  /* Aperçu galerie (page d'accueil) */
  const teaser = $("[data-teaser]");
  if (teaser) loadData("albums", (d) => {
    const items = [];
    (d.albums || []).forEach((a) => a.items.forEach((it) => it.type !== "video" && items.push(it)));
    const pick = items.slice(0, 5);
    if (pick.length) teaser.innerHTML = pick.map((it) => `<a href="galerie.html"><img src="${esc(it.thumb)}" data-id="${esc(it.id || "")}" alt="Activité Coding Host" loading="lazy" decoding="async"></a>`).join("");
  });

  /* ═══════════ CONTACT ═══════════ */
  const cForm = $("#contactForm");
  if (cForm) {
    const q = new URLSearchParams(location.search);
    if (q.get("sujet")) cForm.message.value = q.get("sujet") + "\n\n";
    if (q.get("cours")) { const o = $$("option", cForm.cours).find((x) => x.value === q.get("cours")); if (o) o.selected = true; }
    cForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (cForm.website.value) return;
      const msg = $("#contactMsg"), btn = $("button[type=submit]", cForm);
      const p = { type: "contact", nom: cForm.nom.value, email: cForm.email.value, telephone: cForm.telephone.value, cours: cForm.cours.value, message: cForm.message.value };
      btn.disabled = true;
      try {
        if (!CFG.API_URL) {
          window.location.href = `mailto:${CFG.EMAIL}?subject=${encodeURIComponent("Demande d'information – " + (p.cours || "site web"))}&body=${encodeURIComponent(`Nom : ${p.nom}\nTéléphone : ${p.telephone}\nEmail : ${p.email}\nCours : ${p.cours}\n\n${p.message}`)}`;
        } else {
          const r = await fetch(CFG.API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(p) });
          const d = await r.json(); if (!d.ok) throw new Error();
        }
        cForm.reset(); msg.className = "form-msg ok"; msg.textContent = "Merci ! Votre message est bien parti, nous vous répondons sous 24h.";
      } catch (_) { msg.className = "form-msg err"; msg.textContent = "L'envoi n'a pas fonctionné. Écrivez-nous à " + CFG.EMAIL + " ou appelez le " + CFG.TELEPHONE + "."; }
      btn.disabled = false;
    });
  }
})();
