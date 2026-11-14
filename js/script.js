import { sb, photoUrl } from "../supabase.js";

const FAMILY_COLOUR = { map: "#3a63a8", topo: "#5f86c4", chart: "#2f7f8f", globe: "#8ea4cc", book: "var(--cover-gold)", phrase: "#9aa6bd", gift: "#9aa6bd" };
const CAT_FAMILY = { nz: "map", aust: "map", internat: "map", topo: "topo", travel: "book", language: "phrase", globes: "globe", gps: "gift", software: "chart", posters: "gift", access: "gift", miscell: "gift" };
const ART = {
  map: '<svg class="cv-art" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 16l16-6 16 6 16-6v38l-16 6-16-6-16 6z"/><path d="M24 10v38M40 16v38"/></svg>',
  topo: '<svg class="cv-art" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M100 30c30 2 62 22 66 58s-24 72-64 76-74-26-72-62 36-74 70-72z"/><path d="M100 52c22 2 44 16 46 42s-18 50-46 52-52-18-50-44 26-52 50-50z"/><path d="M102 74c13 1 25 10 26 25s-11 29-27 30-29-11-28-25 15-31 29-30z"/><path d="M103 94c6 0 11 5 11 11s-5 12-12 12-12-5-11-11 6-12 12-12z"/></svg>',
  chart: '<svg class="cv-art" viewBox="0 0 200 80" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M0 20c25-12 50 12 75 0s50-12 75 0 50 12 75 0"/><path d="M0 40c25-12 50 12 75 0s50-12 75 0 50 12 75 0"/><path d="M0 60c25-12 50 12 75 0s50-12 75 0 50 12 75 0"/></svg>',
  globe: '<svg class="cv-art" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="50" cy="50" r="46"/><ellipse cx="50" cy="50" rx="20" ry="46"/><path d="M4 50h92M10 28h80M10 72h80"/></svg>',
  gift: '<svg class="cv-art" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="32" cy="32" r="24"/><path d="M32 12l6 20-6 20-6-20z" fill="currentColor" fill-opacity=".25"/></svg>'
};
const ICON_X = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "$" + Number(n).toFixed(2);
const num = (n) => Number(n).toLocaleString("en-NZ");
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.remove("off"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add("off"), 3200); }
function busy(btn, on, label) {
  if (!btn) return;
  btn.setAttribute("aria-busy", on ? "true" : "false");
  btn.disabled = on;
  btn.textContent = on ? label : (btn.dataset.label || btn.textContent);
}
const friendly = (err, fallback) => (err && (err.message || err.error_description)) || fallback;

let CATS = [], CAT = {};
let PRODUCTS = [], BY_ID = {};
let list = store.get("amc-list", []); // visitor's enquiry list (ids), kept in this browser only

const livePrice = (p) => p.price;

function toProduct(r) {
  const id = String(r.id);
  return {
    id, cat: r.category_id, section: r.section || "", code: r.legacy_code || "", raw: r.raw_title || r.title,
    title: r.title, type: r.product_type, fam: r.cover_family || CAT_FAMILY[r.category_id] || "map",
    region: r.region || "", publisher: r.publisher || "", scale: r.map_scale || "", sheet: r.sheet || "",
    base: Number(r.base_price), price: Number(r.price), photoPath: r.photo_path || "", photo: photoUrl(r.photo_path),
    inStock: r.in_stock !== false, search: ""
  };
}
function indexProduct(p) {
  p.search = [p.title, p.type, p.region, p.publisher, p.raw, CAT[p.cat] ? CAT[p.cat].name : "", p.scale, p.sheet, p.section].join(" ").toLowerCase();
}

const COLS = "id,category_id,section,legacy_code,raw_title,title,product_type,cover_family,region,publisher,map_scale,sheet,base_price,price,photo_path,in_stock";
async function loadCatalogue() {
  const [{ data: cats, error: ce }, { count, error: ne }] = await Promise.all([
    sb.from("categories").select("id,name,blurb,group_name,sort_order").order("sort_order"),
    sb.from("products").select("id", { count: "exact", head: true })
  ]);
  if (ce || ne) throw ce || ne;
  CATS = cats.map(c => ({ id: c.id, name: c.name, blurb: c.blurb || "", group: c.group_name }));
  CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
  const step = 1000, pages = Math.ceil((count || 0) / step);
  const results = await Promise.all(Array.from({ length: pages }, (_, i) =>
    sb.from("products").select(COLS).order("id").range(i * step, i * step + step - 1)));
  const bad = results.find(r => r.error); if (bad) throw bad.error;
  const order = Object.fromEntries(CATS.map((c, i) => [c.id, i]));
  PRODUCTS = results.flatMap(r => r.data).map(toProduct)
    .sort((a, b) => (order[a.cat] ?? 99) - (order[b.cat] ?? 99) || Number(a.id) - Number(b.id));
  PRODUCTS.forEach(indexProduct);
  BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
}

function cover(p) {
  if (p.photo) return `<img class="photo" src="${esc(p.photo)}" alt="${esc(p.title)}" loading="lazy" style="--ar:${p.fam === "map" || p.fam === "chart" ? "4 / 3" : "3 / 4"}">`;
  const top = [p.type, p.scale].filter(Boolean).join(", ");
  const foot = p.sheet ? "Sheet " + p.sheet : (p.publisher || p.region || (CAT[p.cat] ? CAT[p.cat].name : ""));
  return `<div class="cv f-${esc(p.fam)}" aria-hidden="true">${ART[p.fam] || ""}<span class="cv-type">${esc(top)}</span><span class="cv-title">${esc(p.title)}</span><span class="cv-foot">${esc(foot)}</span></div>`;
}
function frame(p, strip) {
  const s = strip == null ? "" : `<span class="strip s${strip}"><span class="num">${money(livePrice(p))}</span><span>${esc(CAT[p.cat].name)}</span></span>`;
  return `<button class="fr" type="button" data-open="${p.id}" aria-label="${esc(p.title)}, ${money(livePrice(p))}">${cover(p)}${s}</button>`;
}
function addBtn(p) { const on = list.includes(p.id); return `<button class="add" type="button" data-add="${p.id}" aria-pressed="${on}">${on ? "On your list" : "Add to list"}</button>`; }

function pickSpread(n) {
  const pool = PRODUCTS.filter(p => p.title.length <= 34);
  const out = [], used = new Set();
  for (let i = 0; out.length < n && i < n * 40; i++) {
    const c = CATS[i % CATS.length].id;
    const cands = pool.filter(p => p.cat === c && !used.has(p.id));
    if (!cands.length) continue;
    const p = cands[(i * 7919) % cands.length];
    used.add(p.id); out.push(p);
  }
  return out;
}
function cellHTML() {
  return `<p class="cell-line">Every map, chart, guide and globe on our Queen Street shelves. Type a place to see what we stock.</p>
    <form class="heroSearch" role="search"><input class="heroQ" type="search" placeholder="Try Tongariro, Kawau or Iceland" aria-label="Type a place to search the shop"><button class="btn" type="submit">Search</button></form>
    <div class="live" aria-live="polite"><p class="live-note">${num(PRODUCTS.length)} items, searched as you type.</p></div>
    <div class="cell-links"><button class="link" type="button" data-cat="topo">Topo maps</button><button class="link" type="button" data-cat="globes">Globes</button><button class="link" type="button" data-cat="travel">Travel guides</button></div>`;
}
function renderHero() {
  const picks = pickSpread(42);
  const cols = [[], [], [], [], [], []];
  picks.forEach((p, i) => cols[i % 6].push(p));
  $("#sheet").innerHTML = cols.map((c, ci) => `<div class="col">${c.map((p, i) => frame(p, (ci + i) % 4)).join("")}</div>`).join("");
  $$(".sheet-wrap .cell-col").forEach(el => el.remove());
  $(".sheet-wrap").insertAdjacentHTML("beforeend", `<div class="cell cell-col">${cellHTML()}</div>`);
  $("#cellPhone").innerHTML = cellHTML();
  $$(".heroSearch").forEach(f => {
    const input = f.querySelector(".heroQ"), live = f.parentElement.querySelector(".live");
    let t;
    input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => renderLive(input.value, live), 90); });
    f.addEventListener("submit", e => { e.preventDefault(); goShop({ q: input.value }); });
  });
}
function renderLive(q, el) {
  const rows = filtered("all", q);
  if (!q.trim()) { el.innerHTML = `<p class="live-note">${num(PRODUCTS.length)} items, searched as you type.</p>`; return; }
  if (!rows.length) { el.innerHTML = `<p class="live-note">Nothing on the shelves for “${esc(q.trim())}”. <button class="link" type="button" data-go="visit" style="color:inherit">Ask us to find it</button></p>`; return; }
  el.innerHTML = rows.slice(0, 4).map(p => `<button class="live-row" type="button" data-open="${p.id}"><span class="mini">${cover(p)}</span><span>${esc(p.title)}<small>${esc([p.type, p.sheet ? "sheet " + p.sheet : p.scale, p.publisher].filter(Boolean).join(", "))}</small></span><span class="num">${money(livePrice(p))}</span></button>`).join("") +
    `<button class="link live-note" type="button" data-q="${esc(q.trim())}" style="justify-self:start;color:var(--on-dark)">See all ${num(rows.length)} for “${esc(q.trim())}”</button>`;
}
let deptSel = "nz";
function renderDepts() {
  const counts = {}; PRODUCTS.forEach(p => counts[p.cat] = (counts[p.cat] || 0) + 1);
  const groups = [...new Set(CATS.map(c => c.group))];
  $("#h-depts").textContent = `${num(CATS.length)} departments`;
  $("#deptRows").innerHTML = groups.map((g, gi) => `<div class="dept-group"><p data-reveal style="--d:${gi * 60}ms">${esc(g)}</p>${CATS.filter(c => c.group === g).map((c, i) =>
    `<button class="drow" type="button" data-dept="${c.id}" aria-current="${c.id === deptSel}" data-reveal style="--d:${gi * 60 + (i + 1) * 70}ms"><span class="dot" style="background:${FAMILY_COLOUR[CAT_FAMILY[c.id]] || "#3a63a8"}"></span><span class="nm">${esc(c.name)}</span><span class="val num">${num(counts[c.id] || 0)} items</span></button>`).join("")}</div>`).join("");
  renderPreview();
}
function renderPreview() {
  const c = CAT[deptSel]; if (!c) return;
  const items = PRODUCTS.filter(p => p.cat === deptSel && p.title.length <= 34);
  const pick = Array.from({ length: Math.min(6, items.length) }, (_, i) => items[Math.floor(i * items.length / 6)]);
  $("#deptPreview").innerHTML = pick.map(p => frame(p)).join("");
  $("#deptBlurb").textContent = c.blurb;
  $("#deptGo").textContent = `Browse ${c.name}`;
  $$(".drow").forEach(b => b.setAttribute("aria-current", b.dataset.dept === deptSel));
}
function renderPicks() {
  const wanted = ["GL RE Windsor Antique 12\" REPLOGLE", "TO50K H36 Mt Cook", "CH 5321 Kawau Island Rangitoto Island Fold", "LG SPA Spanish Phrase Book BERLITZ"];
  const picks = wanted.map(r => PRODUCTS.find(p => p.raw === r)).filter(Boolean);
  while (picks.length < 4) { const p = PRODUCTS.find(x => x.cat === "globes" && !picks.includes(x)); if (!p) break; picks.push(p); }
  $("#pickRun").innerHTML = picks.map((p, i) => `<figure class="${i === 0 ? "lifted" : ""}" data-reveal style="--d:${i * 70}ms">${i === 0 ? `<span class="shutter">${frame(p)}</span>` : frame(p)}<figcaption><span>${esc(p.title)}</span><span class="num">${money(livePrice(p))}</span></figcaption></figure>`).join("");
  const a = picks[0], b = picks[1];
  $("#pickNotes").innerHTML = [
    a && a.raw.startsWith("GL RE Windsor") ? `<p data-reveal>The Windsor: a 12-inch Replogle desk globe in an antique finish.</p>` : "",
    b && b.sheet ? `<p data-reveal style="--d:80ms">Sheet ${esc(b.sheet)}, ${esc(b.title)}: the 1:50 000 topographic sheet for the Aoraki/Mount Cook area.</p>` : ""
  ].join("");
}
function renderFacts() {
  $("#factCount").textContent = `${num(PRODUCTS.length)} maps, guides and globes`;
  const st = openState();
  if (st) $("#factOpen").textContent = st.open ? `Open now, until ${fmt(st.today[3])}` : "Closed right now";
}

const PAGE = 36;
const state = { cat: "all", q: "", sort: "rel", shown: PAGE };
function filtered(cat, q) {
  const words = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  return PRODUCTS.filter(p => (cat === "all" || p.cat === cat) && words.every(w => p.search.includes(w)));
}
function renderShop() {
  if (!PRODUCTS.length) return;
  let rows = filtered(state.cat, state.q);
  if (state.sort === "az") rows = rows.slice().sort((a, b) => a.title.localeCompare(b.title));
  if (state.sort === "lo") rows = rows.slice().sort((a, b) => livePrice(a) - livePrice(b));
  if (state.sort === "hi") rows = rows.slice().sort((a, b) => livePrice(b) - livePrice(a));
  const c = CAT[state.cat], q = state.q.trim();
  $("#h-shop").textContent = c ? c.name : (q ? `Results for “${q}”` : "The shop");
  $("#resultLine").textContent = `${num(rows.length)} ${rows.length === 1 ? "item" : "items"}${c ? " in " + c.name : ""}${q ? ` matching “${q}”` : ""}`;
  const page = rows.slice(0, state.shown);
  $("#results").innerHTML = rows.length ? page.map(p => `<div class="item">${frame(p)}<div class="item-foot"><span class="num">${money(livePrice(p))}</span>${addBtn(p)}</div></div>`).join("")
    : `<p class="empty">Nothing matched. Try a place name, a publisher or a scale, or <button class="link" type="button" data-go="visit">ask us to find it</button>.</p>`;
  $("#moreRow").hidden = rows.length <= state.shown;
  $("#moreNote").textContent = `Showing ${num(page.length)} of ${num(rows.length)}`;
  const counts = {}; filtered("all", state.q).forEach(p => counts[p.cat] = (counts[p.cat] || 0) + 1);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  $("#chips").innerHTML = `<button class="chip" type="button" data-chip="all" aria-pressed="${state.cat === "all"}">All<span class="n num">${num(total)}</span></button>` +
    CATS.filter(c => counts[c.id] || state.cat === c.id).map(c => `<button class="chip" type="button" data-chip="${c.id}" aria-pressed="${state.cat === c.id}">${esc(c.name)}<span class="n num">${num(counts[c.id] || 0)}</span></button>`).join("");
}
let qTimer;
$("#q").addEventListener("input", e => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value; state.shown = PAGE; renderShop(); }, 120); });
$("#sort").addEventListener("change", e => { state.sort = e.target.value; state.shown = PAGE; renderShop(); });
$("#moreBtn").addEventListener("click", () => { state.shown += PAGE * 2; renderShop(); });
function goShop({ cat = "all", q = "" } = {}) {
  Object.assign(state, { cat, q, shown: PAGE }); $("#q").value = q;
  if (location.hash !== "#shop") location.hash = "shop"; else show("shop");
}

const VIEWS = ["home", "shop", "framing", "visit"];
function show(v) {
  if (!VIEWS.includes(v)) v = "home";
  $$("[data-viewpane]").forEach(el => { el.hidden = el.dataset.viewpane !== v; });
  $$(".nav a").forEach(a => { if (a.dataset.view === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  if (v === "shop") renderShop();
  window.scrollTo(0, 0);
  observeReveals();
}
window.addEventListener("hashchange", () => show(location.hash.slice(1)));

// product detail
let lastFocus = null;
function openProduct(id) {
  const p = BY_ID[id]; if (!p) return;
  lastFocus = document.activeElement;
  const rows = [["Department", CAT[p.cat].name], ["Type", p.type], ["Region", p.region], ["Publisher", p.publisher], ["Scale", p.scale], ["Sheet", p.sheet], ["Shop code", p.code]].filter(r => r[1]);
  const on = list.includes(p.id);
  $("#modal").innerHTML = `${cover(p)}<div class="modal-body">
    <button class="x" type="button" data-close aria-label="Close">${ICON_X}</button>
    <h2 id="mTitle">${esc(p.title)}</h2>
    <p class="price num">${money(livePrice(p))} <span class="small soft">NZD</span></p>
    <dl class="spec">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
    <p class="soft" style="font-size:16px">${p.inStock ? "On the shelf at 209 Queen Street." : "Out of stock at the moment, but we can order it in."} Add it to your enquiry list and we'll confirm stock, hold it or post it.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" type="button" data-add="${p.id}" aria-pressed="${on}">${on ? "On your list" : "Add to enquiry list"}</button><button class="btn quiet" type="button" data-list>View list</button></div>
  </div>`;
  $("#modalScrim").hidden = false;
  $("#modal .x").focus();
}
function closeModal() { if ($("#modalScrim").hidden) return; $("#modalScrim").hidden = true; if (lastFocus) lastFocus.focus(); }

// enquiry
function renderDrawer(sent) {
  const items = list.map(id => BY_ID[id]).filter(Boolean);
  const total = items.reduce((s, p) => s + livePrice(p), 0);
  $("#drawerBody").innerHTML = sent ? `<p class="ok">${esc(sent)}</p><button class="btn quiet" type="button" data-close-drawer>Keep browsing</button>` :
    !items.length ? `<p class="soft">Your list is empty. Add maps, guides or globes, then send them to us as one enquiry. We'll check stock and hold them for pickup or post them.</p><div><button class="btn" type="button" data-go="shop">Browse the shop</button></div>` :
    `<ul class="list-items">${items.map(p => `<li><span>${esc(p.title)}<small>${esc(p.type)}</small></span><span class="num">${money(livePrice(p))}</span><button class="rm" type="button" data-rm="${p.id}" aria-label="Remove ${esc(p.title)}">${ICON_X}</button></li>`).join("")}</ul>
    <div class="total"><span>Total at today's prices</span><span class="num">${money(total)}</span></div>
    <form id="listForm" class="fields" novalidate>
      <div class="field"><label for="lf-name">Name</label><input id="lf-name" required autocomplete="name" maxlength="120"></div>
      <div class="field"><label for="lf-email">Email</label><input id="lf-email" type="email" required autocomplete="email" maxlength="254"></div>
      <div class="field full"><label for="lf-how">How would you like them?</label><select id="lf-how"><option value="pickup">Hold for pickup at Queen Street</option><option value="post">Post them to me</option></select></div>
      <div class="field full"><label for="lf-note">Anything else (optional)</label><textarea id="lf-note" maxlength="4000" placeholder="Your postal address, or when you'll pick up"></textarea></div>
      <div class="full form-foot"><button class="btn" type="submit" data-label="Send enquiry">Send enquiry</button><span class="form-note" aria-live="polite"></span></div>
    </form>`;
}
function openDrawer() { lastFocus = document.activeElement; renderDrawer(); $("#drawerScrim").hidden = false; $("#closeDrawer").focus(); }
function closeDrawer() { if ($("#drawerScrim").hidden) return; $("#drawerScrim").hidden = true; if (lastFocus) lastFocus.focus(); }
function updateCount() { $("#listCount").textContent = list.length; }
function toggle(id) {
  list = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
  store.set("amc-list", list); updateCount();
  $$(`[data-add="${id}"]`).forEach(b => { const on = list.includes(id); b.setAttribute("aria-pressed", on); b.textContent = b.classList.contains("btn") ? (on ? "On your list" : "Add to enquiry list") : (on ? "On your list" : "Add to list"); });
}


document.addEventListener("click", e => {
  if (e.target.closest("[data-soon]")) { e.preventDefault(); return; } // placeholder: the staff area isn't built yet
  const t = e.target.closest("button, a");
  if (!t) { if (e.target === $("#modalScrim")) closeModal(); if (e.target === $("#drawerScrim")) closeDrawer(); return; }
  const d = t.dataset;
  if (d.add) toggle(d.add);
  else if (d.open) openProduct(d.open);
  else if (d.dept) { deptSel = d.dept; renderPreview(); }
  else if (d.cat) goShop({ cat: d.cat });
  else if (d.q !== undefined && t.matches("[data-q]")) goShop({ q: d.q });
  else if (d.chip) { state.cat = d.chip; state.shown = PAGE; renderShop(); }
  else if (d.go) { closeModal(); closeDrawer(); location.hash = d.go; }
  else if (d.rm) { toggle(d.rm); renderDrawer(); }
  else if ("close" in d) closeModal();
  else if ("list" in d) { closeModal(); openDrawer(); }
  else if ("closeDrawer" in d) closeDrawer();
  else if (d.copy) {
    const text = $("#" + d.copy).textContent;
    const done = () => { t.textContent = "Copied"; setTimeout(() => t.textContent = "Copy", 1400); };
    try { navigator.clipboard.writeText(text).then(done, () => selectText(d.copy)); } catch (err) { selectText(d.copy); }
  }
});
$("#deptGo").addEventListener("click", () => goShop({ cat: deptSel }));
function selectText(id) { const r = document.createRange(); r.selectNodeContents($("#" + id)); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
$("#openList").addEventListener("click", openDrawer);
$("#closeDrawer").addEventListener("click", closeDrawer);
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); closeDrawer(); } });
$$(".svc-col button").forEach(b => {
  const showDesc = () => { $$(".svc-col button").forEach(x => x.classList.toggle("on", x === b)); $("#svcDesc").textContent = b.dataset.desc; };
  b.addEventListener("mouseenter", showDesc); b.addEventListener("focus", showDesc); b.addEventListener("click", showDesc);
});

// form
function valid(form) {
  let ok = true;
  form.querySelectorAll("[required]").forEach(i => {
    const bad = !i.value.trim() || (i.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.value.trim()));
    i.setAttribute("aria-invalid", bad); i.style.borderColor = bad ? "var(--l-negative)" : "";
    if (bad && ok) { i.focus(); ok = false; }
  });
  if (!ok) toast("Fill in the highlighted fields. Emails need an @ and a domain.");
  return ok;
}
function note(form, msg, bad) { const n = form.querySelector(".form-note"); if (n) { n.textContent = msg; n.classList.toggle("bad", !!bad); } }
async function sendEnquiry(form, row) {
  const btn = form.querySelector("[type=submit]");
  busy(btn, true, "Sending…"); note(form, "");
  const { error } = await sb.from("enquiries").insert(row);
  busy(btn, false);
  if (error) { note(form, `It wasn't sent: ${friendly(error, "please try again")}. You can also phone (09) 309 7725.`, true); return false; }
  return true;
}
document.addEventListener("submit", async e => {
  const f = e.target;
  e.preventDefault();
  if (!valid(f)) return;
  if (f.id === "listForm") {
    const items = list.map(id => BY_ID[id]).filter(Boolean).map(p => ({ id: Number(p.id), title: p.title, code: p.code, price: livePrice(p) }));
    const name = $("#lf-name").value.trim();
    const ok = await sendEnquiry(f, { kind: "list", name, email: $("#lf-email").value.trim(), fulfilment: $("#lf-how").value, items, message: $("#lf-note").value.trim() || null });
    if (!ok) return;
    const n = items.length;
    list = []; store.set("amc-list", list); updateCount(); renderShop();
    renderDrawer(`Thanks, ${name.split(" ")[0]}. Your enquiry for ${n} ${n === 1 ? "item" : "items"} is with the shop team. We'll confirm stock by email.`);
  } else if (f.id === "quoteForm") {
    const message = [$("#qs-item").value.trim() && `Item: ${$("#qs-item").value.trim()}`, $("#qs-notes").value.trim()].filter(Boolean).join("\n\n") || null;
    const ok = await sendEnquiry(f, { kind: "quote", name: $("#qs-name").value.trim(), email: $("#qs-email").value.trim(), service: $("#qs-service").value, size: $("#qs-size").value, message });
    if (!ok) return;
    const box = $("#quoteOk"); box.hidden = false;
    box.textContent = `Thanks. Your quote request for ${$("#qs-service").value.toLowerCase()}, ${$("#qs-size").value.split(",")[0]}, is with the framing team. We'll email you a price.`;
    f.reset();
  } else if (f.id === "contactForm") {
    const ok = await sendEnquiry(f, { kind: "general", name: $("#cf-name").value.trim(), email: $("#cf-email").value.trim(), message: $("#cf-msg").value.trim() || null });
    if (!ok) return;
    const box = $("#contactOk"); box.hidden = false;
    box.textContent = "Thanks. We've got your enquiry and will email you once we've checked the shelves and our suppliers.";
    f.reset();
  }
});

// open hours
const HOURS = [["Monday", "Mon", 540, 1050], ["Tuesday", "Tue", 540, 1050], ["Wednesday", "Wed", 540, 1050], ["Thursday", "Thu", 540, 1050], ["Friday", "Fri", 540, 1050], ["Saturday", "Sat", 600, 960], ["Sunday", "Sun", 600, 840]];
const fmt = (m) => { const h = Math.floor(m / 60), mm = m % 60; return `${((h + 11) % 12) + 1}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${h < 12 ? "am" : "pm"}`; };
function openState() {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Auckland", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()).map(p => [p.type, p.value]));
    const today = HOURS.find(h => h[1] === parts.weekday); if (!today) return null;
    const mins = (Number(parts.hour) % 24) * 60 + Number(parts.minute);
    return { today, open: mins >= today[2] && mins < today[3] };
  } catch (e) { return null; }
}
function renderHours() {
  const st = openState();
  $("#hours").innerHTML = HOURS.map(([full, short, o, c]) => `<tr class="${st && st.today[1] === short ? "today" : ""}"><td>${full}${st && st.today[1] === short ? ", today" : ""}</td><td class="num">${fmt(o)} – ${fmt(c)}</td></tr>`).join("");
  const s = $("#openStatus");
  if (!st) { s.textContent = "Opening hours"; return; }
  s.className = "status " + (st.open ? "open" : "shut");
  s.textContent = st.open ? `Open now, until ${fmt(st.today[3])}` : "Closed right now";
}

// scroll animation
let io = null;
function observeReveals() {
  const els = $$("[data-reveal]:not(.is-in)");
  if (!("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("is-in")); return; }
  if (!io) io = new IntersectionObserver(entries => { for (const en of entries) if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
  els.forEach(el => io.observe(el));
}

// start up : show page, load product and staff login
renderHours(); updateCount();
show(location.hash.slice(1) || "home");
loadCatalogue().then(() => {
  list = list.filter(id => BY_ID[id]); store.set("amc-list", list); updateCount();
  renderHero(); renderFacts(); renderDepts(); renderPicks(); renderShop();
  observeReveals();
}).catch(err => {
  console.error(err);
  $("#sheet").innerHTML = `<p class="empty frame-x">The product list didn't load. Refresh the page to try again.</p>`;
  $("#resultLine").textContent = "The product list didn't load. Refresh the page to try again.";
});
