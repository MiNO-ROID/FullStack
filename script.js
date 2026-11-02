// Supabase connection. The publishable key is safe in website code: the security rules protect the data.
const db = supabase.createClient(
  "https://ctfmdagftjbjmrxcvifw.supabase.co",
  "sb_publishable_vlMtSjFVVXrntElJYlrUzA_wPpJ1_TO"
);
const PHOTO_BUCKET = "product-photos";
const PRODUCT_COLUMNS = "id, category_id, legacy_code, raw_title, title, product_type, cover_family, region, publisher, map_scale, sheet, base_price, price, photo_path";

let CATS = [], CAT = {};
const FAMILY_COLOUR = { map: "#3a63a8", topo: "#5f86c4", chart: "#2f7f8f", globe: "#8ea4cc", book: "var(--cover-gold)", phrase: "#9aa6bd", gift: "#9aa6bd" };
const CAT_FAMILY = { nz: "map", aust: "map", internat: "map", topo: "topo", travel: "book", language: "phrase", globes: "globe", gps: "gift", software: "chart", posters: "gift", access: "gift", miscell: "gift" };

// Drawn cover art per family: geometry only, in the cover's gold
const ART = {
  map: '<svg class="cv-art" viewBox="0 0 64 64" aria-hidden="true"><use href="assets/icons/cover-map.svg#icon"/></svg>',
  topo: '<svg class="cv-art" viewBox="0 0 200 200" aria-hidden="true"><use href="assets/icons/cover-topo.svg#icon"/></svg>',
  chart: '<svg class="cv-art" viewBox="0 0 200 80" aria-hidden="true"><use href="assets/icons/cover-chart.svg#icon"/></svg>',
  globe: '<svg class="cv-art" viewBox="0 0 100 100" aria-hidden="true"><use href="assets/icons/cover-globe.svg#icon"/></svg>',
  gift: '<svg class="cv-art" viewBox="0 0 64 64" aria-hidden="true"><use href="assets/icons/cover-gift.svg#icon"/></svg>'
};

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "$" + Number(n).toFixed(2);
const num = (n) => Number(n).toLocaleString("en-NZ");
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private window: the list just won't be remembered */ } }
};
const ICON_X = '<svg viewBox="0 0 16 16" aria-hidden="true"><use href="assets/icons/close.svg#icon"/></svg>';
const TRI_UP = '<svg viewBox="0 0 8 8" aria-hidden="true"><use href="assets/icons/arrow-up.svg#icon"/></svg>';
const TRI_DOWN = '<svg viewBox="0 0 8 8" aria-hidden="true"><use href="assets/icons/arrow-down.svg#icon"/></svg>';

let PRODUCTS = [], BY_ID = {};
let draft = {};
let list = store.get("amc-list", []);
let staff = null; // { id, email, role } once signed in
let team = [];
const livePrice = (p) => p.price;
const adminPrice = (p) => (p.id in draft ? draft[p.id] : livePrice(p));

function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.remove("off"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add("off"), 2800); }

// ---------- Supabase data ----------
// Supabase returns at most 1,000 rows per request, so this asks page by page until there are no more.
async function fetchAll(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await buildQuery().order("id").range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
const photoUrl = (path) => db.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
function toProduct(r) {
  return {
    id: String(r.id), cat: r.category_id, code: r.legacy_code, raw: r.raw_title, title: r.title,
    type: r.product_type, fam: r.cover_family, region: r.region || "", publisher: r.publisher || "", scale: r.map_scale || "", sheet: r.sheet || "",
    base: Number(r.base_price), price: Number(r.price), photoPath: r.photo_path, photo: r.photo_path ? photoUrl(r.photo_path) : ""
  };
}

// ---------- Search: ILIKE, every word must appear in at least one of these columns ----------
const SEARCH_COLUMNS = ["raw_title", "product_type", "region", "publisher", "map_scale", "section"];
const searchHits = new Map(); // search text -> Set of matching product ids
const searchKey = (q) => String(q || "").trim().toLowerCase().replace(/\s+/g, " ");
async function runSearch(q) {
  const key = searchKey(q);
  if (!key || searchHits.has(key)) return;
  const rows = await fetchAll(() => {
    let query = db.from("products").select("id");
    for (const word of key.split(" ")) {
      const pattern = `"%${word.replace(/[\\%_"]/g, "\\$&")}%"`;
      query = query.or(SEARCH_COLUMNS.map(c => `${c}.ilike.${pattern}`).join(","));
    }
    return query;
  });
  searchHits.set(key, new Set(rows.map(r => String(r.id))));
}
// Runs the search, then redraws, unless the visitor has typed something newer in the meantime
let searchRun = 0;
async function searchThen(q, draw) {
  const run = ++searchRun;
  try { await runSearch(q); }
  catch (err) { toast("Search didn't work. Check your connection and try again."); return; }
  if (run === searchRun) draw();
}

// ---------- Covers ----------
function cover(p) {
  if (p.photo) return `<img class="photo" src="${esc(p.photo)}" alt="${esc(p.title)}" style="--ar:${p.fam === "map" || p.fam === "chart" ? "4 / 3" : "3 / 4"}">`;
  const top = [p.type, p.scale].filter(Boolean).join(", ");
  const foot = p.sheet ? "Sheet " + p.sheet : (p.publisher || p.region || CAT[p.cat].name);
  return `<div class="cv f-${p.fam}" aria-hidden="true">${ART[p.fam] || ""}<span class="cv-type">${esc(top)}</span><span class="cv-title">${esc(p.title)}</span><span class="cv-foot">${esc(foot)}</span></div>`;
}
function frame(p, strip) {
  const s = strip == null ? "" : `<span class="strip s${strip}"><span class="num">${money(livePrice(p))}</span><span>${esc(CAT[p.cat].name)}</span></span>`;
  return `<button class="fr" type="button" data-open="${p.id}" aria-label="${esc(p.title)}, ${money(livePrice(p))}">${cover(p)}${s}</button>`;
}
function addBtn(p) { const on = list.includes(p.id); return `<button class="add" type="button" data-add="${p.id}" aria-pressed="${on}">${on ? "On your list" : "Add to list"}</button>`; }

// ---------- Home ----------
function pickSpread(n, filter) {
  const pool = PRODUCTS.filter(p => p.title.length <= 34 && (!filter || filter(p)));
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
    <div class="live" aria-live="polite"><p class="live-note">${num(PRODUCTS.length || 6867)} items, searched as you type.</p></div>
    <div class="cell-links"><button class="link" type="button" data-cat="topo">Topo maps</button><button class="link" type="button" data-cat="globes">Globes</button><button class="link" type="button" data-cat="travel">Travel guides</button></div>`;
}
function renderHero() {
  const picks = pickSpread(42);
  const cols = [[], [], [], [], [], []];
  picks.forEach((p, i) => cols[i % 6].push(p));
  $("#sheet").innerHTML = cols.map((c, ci) => `<div class="col">${c.map((p, i) => frame(p, (ci + i) % 4)).join("")}</div>`).join("");
  $(".sheet-wrap").insertAdjacentHTML("beforeend", `<div class="cell cell-col">${cellHTML()}</div>`);
  $("#cellPhone").innerHTML = cellHTML();
  $$(".heroSearch").forEach(f => {
    const input = f.querySelector(".heroQ"), live = f.parentElement.querySelector(".live");
    let t;
    input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => searchThen(input.value, () => renderLive(input.value, live)), 150); });
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
  $("#deptRows").innerHTML = groups.map((g, gi) => `<div class="dept-group"><p data-reveal style="--d:${gi * 60}ms">${g}</p>${CATS.filter(c => c.group === g).map((c, i) =>
    `<button class="drow" type="button" data-dept="${c.id}" aria-current="${c.id === deptSel}" data-reveal style="--d:${gi * 60 + (i + 1) * 70}ms"><span class="dot" style="background:${FAMILY_COLOUR[CAT_FAMILY[c.id]]}"></span><span class="nm">${esc(c.name)}</span><span class="val num">${num(counts[c.id] || 0)} items</span></button>`).join("")}</div>`).join("");
  renderPreview();
}
function renderPreview() {
  const c = CAT[deptSel];
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
    a ? `<p data-reveal>The Windsor: a 12-inch Replogle desk globe in an antique finish.</p>` : "",
    b && b.sheet ? `<p data-reveal style="--d:80ms">Sheet ${esc(b.sheet)}, ${esc(b.title)}: the 1:50 000 topographic sheet for the Aoraki/Mount Cook area.</p>` : ""
  ].join("");
}
function renderFacts() {
  $("#factCount").textContent = `${num(PRODUCTS.length)} maps, guides and globes`;
  const st = openState();
  if (st) { $("#factOpen").textContent = st.open ? `Open now, until ${fmt(st.today[3])}` : "Closed right now"; $("#factOpenSub").textContent = "Mon–Fri 9–5:30, Sat 10–4, Sun 10–2"; }
}

// ---------- Shop ----------
const PAGE = 36;
const state = { cat: "all", q: "", sort: "rel", shown: PAGE };
function filtered(cat, q) {
  const key = searchKey(q), hits = searchHits.get(key);
  return PRODUCTS.filter(p => (cat === "all" || p.cat === cat) && (!key || (hits && hits.has(p.id))));
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
$("#q").addEventListener("input", e => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value; state.shown = PAGE; searchThen(state.q, renderShop); }, 150); });
$("#sort").addEventListener("change", e => { state.sort = e.target.value; state.shown = PAGE; renderShop(); });
$("#moreBtn").addEventListener("click", () => { state.shown += PAGE * 2; renderShop(); });
function goShop({ cat = "all", q = "" } = {}) {
  Object.assign(state, { cat, q, shown: PAGE }); $("#q").value = q;
  searchThen(q, () => { if (location.hash !== "#shop") location.hash = "shop"; else show("shop"); });
}

// ---------- Views ----------
const VIEWS = ["home", "shop", "framing", "visit", "staff", "staff-team"];
function show(v) {
  if (!VIEWS.includes(v)) v = "home";
  const isStaff = v.startsWith("staff");
  $("#site").hidden = isStaff;
  $("#staffApp").hidden = !isStaff;
  $$("[data-viewpane]").forEach(el => { el.hidden = el.dataset.viewpane !== v; });
  $$(".nav a").forEach(a => { if (a.dataset.view === v) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  if (v === "shop") renderShop();
  if (isStaff) renderStaff(v === "staff-team" ? "team" : "prices");
  window.scrollTo(0, 0);
  observeReveals();
}
window.addEventListener("hashchange", () => show(location.hash.slice(1)));

// ---------- Product detail ----------
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
    <p class="soft" style="font-size:16px">On the shelf at 209 Queen Street. Add it to your enquiry list and we'll confirm stock, hold it or post it.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" type="button" data-add="${p.id}" aria-pressed="${on}">${on ? "On your list" : "Add to enquiry list"}</button><button class="btn quiet" type="button" data-list>View list</button></div>
  </div>`;
  $("#modalScrim").hidden = false;
  $("#modal .x").focus();
}
function closeModal() { if ($("#modalScrim").hidden) return; $("#modalScrim").hidden = true; if (lastFocus) lastFocus.focus(); }

// ---------- Enquiry list ----------
function renderDrawer(sent) {
  const items = list.map(id => BY_ID[id]).filter(Boolean);
  const total = items.reduce((s, p) => s + livePrice(p), 0);
  $("#drawerBody").innerHTML = sent ? `<p class="ok">${esc(sent)}</p><button class="btn quiet" type="button" data-close-drawer>Keep browsing</button>` :
    !items.length ? `<p class="soft">Your list is empty. Add maps, guides or globes, then send them to us as one enquiry. We'll check stock and hold them for pickup or post them.</p><div><button class="btn" type="button" data-go="shop">Browse the shop</button></div>` :
      `<ul class="list-items">${items.map(p => `<li><span>${esc(p.title)}<small>${esc(p.type)}</small></span><span class="num">${money(livePrice(p))}</span><button class="rm" type="button" data-rm="${p.id}" aria-label="Remove ${esc(p.title)}">${ICON_X}</button></li>`).join("")}</ul>
    <div class="total"><span>Total at today's prices</span><span class="num">${money(total)}</span></div>
    <form id="listForm" class="fields" novalidate>
      <div class="field"><label for="lf-name">Name</label><input id="lf-name" required autocomplete="name"></div>
      <div class="field"><label for="lf-email">Email</label><input id="lf-email" type="email" required autocomplete="email"></div>
      <div class="field full"><label for="lf-how">How would you like them?</label><select id="lf-how"><option value="pickup">Hold for pickup at Queen Street</option><option value="post">Post them to me</option></select></div>
      <div class="full form-foot"><button class="btn" type="submit">Send enquiry</button></div>
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

// ---------- Staff ledger ----------
const admin = { q: "", cat: "all", tab: "all", page: 0, per: 25 };
function renderStaff(area) {
  $("#signinPane").hidden = !!staff;
  $("#dashPane").hidden = !staff;
  if (!staff) { setTimeout(() => $("#si-pass").focus(), 0); return; }
  $("#pricesView").hidden = area !== "prices";
  $("#teamView").hidden = area !== "team";
  $$(".rail [data-staff]").forEach(a => { if (a.dataset.staff === area) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  if (!PRODUCTS.length) { $("#rows").innerHTML = Array.from({ length: 6 }, () => `<tr><td><span class="sk" style="width:40px;height:50px"></span></td><td><span class="sk"></span></td><td><span class="sk"></span></td><td class="num"><span class="sk" style="width:80px"></span></td><td></td><td></td></tr>`).join(""); return; }
  if (!$("#acat").options.length) {
    const opts = `<option value="all">All departments</option>` + CATS.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
    $("#acat").innerHTML = opts; $("#b-cat").innerHTML = CATS.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
    $("#b-cat").value = "globes";
  }
  if (area === "prices") { renderLedger(); renderBulk(); }
  else { $("#inviteForm").hidden = staff.role !== "owner"; loadTeam(); }
}
function changedIds() { return new Set(PRODUCTS.filter(p => Math.abs(adminPrice(p) - p.base) >= 0.005 || p.id in draft).map(p => p.id)); }
function ledgerRows() {
  let rows = filtered(admin.cat, admin.q);
  if (admin.tab === "changed") { const ch = changedIds(); rows = rows.filter(p => ch.has(p.id)); }
  if (admin.tab === "nophoto") rows = rows.filter(p => !p.photo);
  return rows;
}
function renderFinding() {
  const pending = Object.keys(draft).length, live = PRODUCTS.filter(p => Math.abs(p.price - p.base) >= 0.005).length;
  $("#finding").innerHTML = pending ? `<b>${num(pending)} unsaved ${pending === 1 ? "change" : "changes"}</b> · ${num(live)} prices already differ from the old price list`
    : `${num(live)} of ${num(PRODUCTS.length)} prices differ from the old price list · nothing waiting to save`;
  $("#save").disabled = !pending; $("#discard").disabled = !pending;
  $("#save").textContent = pending ? `Save ${num(pending)} ${pending === 1 ? "change" : "changes"}` : "Save changes";
  const scoped = filtered(admin.cat, admin.q), ch = changedIds();
  $("#nAll").textContent = num(scoped.length);
  $("#nChanged").textContent = num(scoped.filter(p => ch.has(p.id)).length);
  $("#nNoPhoto").textContent = num(scoped.filter(p => !p.photo).length);
}
function renderLedger() {
  renderFinding();
  const rows = ledgerRows();
  const pages = Math.max(1, Math.ceil(rows.length / admin.per));
  admin.page = Math.min(admin.page, pages - 1);
  const start = admin.page * admin.per, slice = rows.slice(start, start + admin.per);
  $("#countNote").textContent = `${num(rows.length)} ${rows.length === 1 ? "product" : "products"}`;
  $("#rows").innerHTML = slice.length ? slice.map(p => {
    const now = adminPrice(p), ref = p.base, diff = Math.round((now - ref) * 100) / 100, pending = p.id in draft;
    const chg = Math.abs(diff) < 0.005 ? `<span class="dash">–</span>` : `<span class="chg ${diff > 0 ? "up" : "down"}">${diff > 0 ? TRI_UP : TRI_DOWN}${diff > 0 ? "+" : "−"}${money(Math.abs(diff)).replace("$", "$")}<span class="was">was ${money(ref)}</span></span>`;
    return `<tr class="${pending ? "changed" : ""}">
      <td><label class="thumb" title="${p.photo ? "Replace photo" : "Add a photo"}">${p.photo ? `<img src="${esc(p.photo)}" alt="">` : cover(p)}<span class="tip">${p.photo ? "Replace" : "Add"}</span><input type="file" accept="image/*" data-photo="${p.id}" aria-label="${p.photo ? "Replace" : "Add a"} photo for ${esc(p.title)}"></label></td>
      <td><span class="t">${esc(p.title)}</span><span class="sub">${esc(p.code)} · ${esc(p.type)}${p.sheet ? " · sheet " + esc(p.sheet) : ""}</span></td>
      <td class="dept">${esc(CAT[p.cat].name)}</td>
      <td class="num"><span class="pin"><span>$</span><input inputmode="decimal" value="${now.toFixed(2)}" data-price="${p.id}" aria-label="Price for ${esc(p.title)}"></span></td>
      <td class="num">${chg}</td>
      <td>${pending ? `<button class="undo" type="button" data-undo="${p.id}">Undo</button>` : (p.photo ? `<button class="undo" type="button" data-unphoto="${p.id}">Remove photo</button>` : "")}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="6" style="height:auto;padding:24px 8px;color:var(--l-muted)">${admin.tab === "changed" ? "No changed prices in this view. Edit a price, or use Change a department." : "No products match. Try a shorter word or another department."}</td></tr>`;
  $("#pageInfo").textContent = rows.length ? `${num(start + 1)}–${num(start + slice.length)} of ${num(rows.length)}` : "0 products";
  $("#prev").disabled = admin.page === 0; $("#next").disabled = admin.page >= pages - 1;
}
function roundPrice(x, mode) {
  if (x <= 0) return 0;
  if (mode === "95") return Math.max(0.95, Math.ceil(x - 0.95 - 1e-9) + 0.95);
  if (mode === "99") return Math.max(0.99, Math.ceil(x - 0.99 - 1e-9) + 0.99);
  if (mode === "10") return Math.round(x * 10) / 10;
  return Math.round(x * 100) / 100;
}
function bulkPlan() {
  const pct = parseFloat($("#b-pct").value) || 0, mode = $("#b-round").value, cat = $("#b-cat").value;
  const rows = PRODUCTS.filter(p => p.cat === cat);
  const changes = rows.map(p => [p, Math.round(roundPrice(adminPrice(p) * (1 + pct / 100), mode) * 100) / 100]);
  const before = rows.reduce((s, p) => s + adminPrice(p), 0), after = changes.reduce((s, [, v]) => s + v, 0);
  return { pct, cat, rows, changes, before, after };
}
function renderBulk() {
  const { rows, changes, before, after } = bulkPlan();
  const ex = changes.find(([p]) => adminPrice(p) >= 20) || changes[0];
  $("#bulkWell").innerHTML = rows.length ? `<div><dt>Products</dt><dd>${num(rows.length)}</dd></div>
    <div><dt>Average price</dt><dd>${money(before / rows.length)} → ${money(after / rows.length)}</dd></div>
    <div><dt>${esc(ex[0].title.length > 22 ? ex[0].title.slice(0, 21) + "…" : ex[0].title)}</dt><dd>${money(adminPrice(ex[0]))} → ${money(ex[1])}</dd></div>` : `<div><dt>No products in this department</dt><dd>–</dd></div>`;
}
function setDraft(p, price) { if (Math.abs(price - livePrice(p)) < 0.005) delete draft[p.id]; else draft[p.id] = price; }
const TINTS = ["#dbe6f7", "#f3e6c4", "#dcefe4", "#f2dce0", "#e4def5"];
function renderTeam() {
  $("#team").innerHTML = team.map(t => {
    const you = t.id === staff.id, role = t.role === "owner" ? "Owner" : "Staff";
    return `<li><span class="av" style="background:${TINTS[hash(t.email) % TINTS.length]}">${esc(t.email.trim()[0].toUpperCase())}</span><span style="min-width:0;overflow-wrap:anywhere">${esc(t.email)}<br><span style="color:var(--l-muted);font-size:12px">${you ? "Signed in now" : "Can sign in"}</span></span><span class="pill">${role}</span></li>`;
  }).join("");
}
async function loadTeam() {
  const { data, error } = await db.from("staff").select("id, email, role").order("created_at");
  if (error) { toast("The team list didn't load. Refresh the page to try again."); return; }
  team = data; renderTeam();
}
function addPhoto(id, file) {
  if (!file || !file.type.startsWith("image/")) { toast("Choose an image file, such as a JPG or PNG."); return; }
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const w = 480, h = 640, c = document.createElement("canvas"); c.width = w; c.height = h;
    const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
    c.getContext("2d").drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    URL.revokeObjectURL(url);
    c.toBlob(blob => savePhoto(id, blob), "image/jpeg", 0.8);
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast("That image couldn't be read. Try a JPG or PNG."); };
  img.src = url;
}
async function setPhotoPath(p, path) {
  const { data, error } = await db.from("products").update({ photo_path: path }).eq("id", Number(p.id)).select("id");
  if (error || !data.length) return false;
  if (p.photoPath) await db.storage.from(PHOTO_BUCKET).remove([p.photoPath]);
  p.photoPath = path; p.photo = path ? photoUrl(path) : "";
  return true;
}
async function savePhoto(id, blob) {
  const p = BY_ID[id], path = `${id}-${Date.now()}.jpg`;
  toast("Uploading the photo…");
  const { error } = await db.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (error || !(await setPhotoPath(p, path))) { toast("The photo didn't save. Try again."); return; }
  renderLedger(); toast("Photo added. It now shows in the shop.");
}
async function removePhoto(id) {
  if (!(await setPhotoPath(BY_ID[id], null))) { toast("The photo wasn't removed. Try again."); return; }
  renderLedger(); toast("Photo removed. The printed cover shows again.");
}
$("#aq").addEventListener("input", e => { clearTimeout(qTimer); qTimer = setTimeout(() => { admin.q = e.target.value; admin.page = 0; searchThen(admin.q, renderLedger); }, 150); });
$("#acat").addEventListener("change", e => { admin.cat = e.target.value; admin.page = 0; renderLedger(); });
$("#prev").addEventListener("click", () => { admin.page--; renderLedger(); });
$("#next").addEventListener("click", () => { admin.page++; renderLedger(); });
["#b-cat", "#b-pct", "#b-round"].forEach(s => $(s).addEventListener("input", renderBulk));
$("#inv-email").addEventListener("input", e => { $("#mailBody").textContent = `${e.target.value.trim() || "They"} will get a link to set a password and start changing prices and photos for the website.`; });
$("#rows").addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.price) {
    const p = BY_ID[t.dataset.price], v = parseFloat(t.value.replace(/[$,\s]/g, ""));
    if (!isFinite(v) || v < 0) { t.value = adminPrice(p).toFixed(2); toast("Enter a price like 24.95"); return; }
    setDraft(p, Math.round(v * 100) / 100); renderLedger();
  }
  if (t.dataset.photo) addPhoto(t.dataset.photo, t.files[0]);
});
$("#rows").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset.price) e.target.blur(); });
// Each product is its own update, so the database logs every change in price_changes
$("#save").addEventListener("click", async () => {
  const entries = Object.entries(draft), btn = $("#save");
  btn.disabled = true; btn.textContent = "Saving…";
  let done = 0;
  for (let i = 0; i < entries.length; i += 25) {
    await Promise.all(entries.slice(i, i + 25).map(async ([id, price]) => {
      const { data, error } = await db.from("products").update({ price }).eq("id", Number(id)).select("id");
      if (error || !data.length) return;
      BY_ID[id].price = price; delete draft[id]; done++;
    }));
  }
  renderLedger(); renderBulk();
  const left = Object.keys(draft).length;
  toast(left ? `Saved ${num(done)}, but ${num(left)} didn't save. Try again.` : `Saved ${num(done)} ${done === 1 ? "price" : "prices"}. The shop shows them now.`);
});
$("#discard").addEventListener("click", () => { const n = Object.keys(draft).length; draft = {}; renderLedger(); renderBulk(); toast(`Discarded ${num(n)} unsaved ${n === 1 ? "change" : "changes"}.`); });
$("#signOut").addEventListener("click", async () => { await db.auth.signOut(); staff = null; draft = {}; renderStaff("prices"); toast("Signed out."); });
$$(".tab").forEach(b => b.addEventListener("click", () => { admin.tab = b.dataset.tab; admin.page = 0; $$(".tab").forEach(x => x.setAttribute("aria-selected", x === b)); renderLedger(); }));

// ---------- One delegated click handler ----------
document.addEventListener("click", e => {
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
  else if (d.undo) { delete draft[d.undo]; renderLedger(); }
  else if (d.unphoto) removePhoto(d.unphoto);
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
// Service names show their description in the fixed spot
$$(".svc-col button").forEach(b => {
  const showDesc = () => { $$(".svc-col button").forEach(x => x.classList.toggle("on", x === b)); $("#svcDesc").textContent = b.dataset.desc; };
  b.addEventListener("mouseenter", showDesc); b.addEventListener("focus", showDesc); b.addEventListener("click", showDesc);
});

function valid(form) {
  let ok = true;
  form.querySelectorAll("[required]").forEach(i => {
    const bad = !i.value.trim() || (i.type === "email" && !/^\S+@\S+\.\S+$/.test(i.value));
    i.setAttribute("aria-invalid", bad); i.style.borderColor = bad ? "var(--l-negative)" : "";
    if (bad && ok) { i.focus(); ok = false; }
  });
  if (!ok) toast("Fill in the highlighted fields. Emails need an @ and a domain.");
  return ok;
}
// Greys out the form's button while it sends, so a double click can't send it twice
async function sending(form, send) {
  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  try { await send(); } finally { btn.disabled = false; }
}
async function sendEnquiry(row) {
  const { error } = await db.from("enquiries").insert(row);
  if (error) toast("That didn't send. Check your details and try again.");
  return !error;
}
// Signs in staff only: a login that isn't on the staff table is signed straight back out
async function loadStaff(user) {
  const { data } = await db.from("staff").select("id, email, role").eq("id", user.id).maybeSingle();
  if (!data) { await db.auth.signOut(); return false; }
  staff = data;
  return true;
}
const staffArea = () => (location.hash === "#staff-team" ? "team" : "prices");
const SUBMITS = {
  async listForm() {
    const items = list.map(id => BY_ID[id]).filter(Boolean);
    const name = $("#lf-name").value.trim();
    const ok = await sendEnquiry({ kind: "list", name, email: $("#lf-email").value.trim(), fulfilment: $("#lf-how").value, items: items.map(p => ({ id: Number(p.id), title: p.title, price: p.price })) });
    if (!ok) return;
    list = []; store.set("amc-list", list); updateCount(); renderShop();
    renderDrawer(`Thanks, ${name.split(" ")[0]}. We've got your enquiry for ${items.length} ${items.length === 1 ? "item" : "items"}, and we'll email you to confirm stock.`);
  },
  async quoteForm(f) {
    const message = [$("#qs-item").value.trim(), $("#qs-notes").value.trim()].filter(Boolean).join("\n\n") || null;
    const service = $("#qs-service").value, size = $("#qs-size").value.split(",")[0];
    const ok = await sendEnquiry({ kind: "quote", name: $("#qs-name").value.trim(), email: $("#qs-email").value.trim(), service, size, message });
    if (!ok) return;
    f.reset();
    $("#quoteOk").hidden = false;
    $("#quoteOk").textContent = `Thanks. We've got your quote request for ${service.toLowerCase()}, ${size}, and we'll reply by email.`;
  },
  async contactForm(f) {
    const ok = await sendEnquiry({ kind: "general", name: $("#cf-name").value.trim(), email: $("#cf-email").value.trim(), message: $("#cf-msg").value.trim() || null });
    if (!ok) return;
    f.reset();
    $("#contactOk").hidden = false;
    $("#contactOk").textContent = "Thanks. We've got your enquiry and we'll reply by email.";
  },
  async signinForm() {
    const note = $("#siNote"); note.textContent = "";
    const { data, error } = await db.auth.signInWithPassword({ email: $("#si-email").value.trim(), password: $("#si-pass").value });
    if (error) { note.textContent = "That email or password isn't right."; return; }
    if (!(await loadStaff(data.user))) { note.textContent = "This account isn't on the team. Ask the shop owner for an invite."; return; }
    $("#si-pass").value = ""; renderStaff(staffArea()); toast("Signed in.");
  },
  async inviteForm() {
    const email = $("#inv-email").value.trim().toLowerCase();
    const { error } = await db.functions.invoke("invite-staff", { body: { email } });
    if (error) {
      const reply = error.context ? await error.context.json().catch(() => null) : null;
      toast((reply && reply.error) || "The invite didn't send. Try again.");
      return;
    }
    $("#inv-email").value = ""; await loadTeam();
    toast(`Invite sent to ${email}.`);
  }
};
document.addEventListener("submit", e => {
  const f = e.target;
  e.preventDefault();
  if (!valid(f)) return;
  if (f.id === "bulkForm") {
    const { changes, rows, cat, pct } = bulkPlan();
    changes.forEach(([p, v]) => setDraft(p, v));
    admin.tab = "changed"; admin.cat = cat; admin.page = 0; $("#acat").value = cat;
    $$(".tab").forEach(x => x.setAttribute("aria-selected", x.dataset.tab === "changed"));
    renderLedger(); renderBulk();
    toast(`${num(rows.length)} ${CAT[cat].name.toLowerCase()} prices ${pct >= 0 ? "up" : "down"} ${Math.abs(pct)}%. Check them, then save.`);
  } else if (SUBMITS[f.id]) sending(f, () => SUBMITS[f.id](f));
});

// ---------- Opening hours, in Auckland time ----------
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

// ---------- Entrances ----------
let io = null;
function observeReveals() {
  const els = $$("[data-reveal]:not(.is-in)");
  if (!("IntersectionObserver" in window)) { els.forEach(el => el.classList.add("is-in")); return; }
  if (!io) io = new IntersectionObserver(entries => { for (const en of entries) if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
  els.forEach(el => io.observe(el));
}

// ---------- Boot ----------
renderHours(); updateCount();
show(location.hash.slice(1) || "home");
async function loadCatalogue() {
  const { data: cats, error } = await db.from("categories").select("id, name, blurb, group_name").order("sort_order");
  if (error) throw error;
  CATS = cats.map(c => ({ id: c.id, name: c.name, blurb: c.blurb, group: c.group_name }));
  CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
  const rows = await fetchAll(() => db.from("products").select(PRODUCT_COLUMNS));
  PRODUCTS = rows.map(toProduct);
  BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
  list = list.filter(id => BY_ID[id]); updateCount();
  renderHero(); renderFacts(); renderDepts(); renderPicks(); renderShop();
  if (location.hash.startsWith("#staff")) renderStaff(staffArea());
  observeReveals();
}
loadCatalogue().catch(() => {
  $("#sheet").innerHTML = `<p class="empty frame-x">The product list didn't load. Refresh the page to try again.</p>`;
  $("#resultLine").textContent = "The product list didn't load. Refresh the page to try again.";
});
// Staff stay signed in between visits
db.auth.getSession().then(async ({ data: { session } }) => {
  if (session && (await loadStaff(session.user)) && location.hash.startsWith("#staff")) renderStaff(staffArea());
});
