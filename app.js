// Reads vocab.csv (unit,german,spanish) and runs flashcards with learn/retry/done.
// Progress is saved on this device using localStorage.

const CSV_PATH = "vocab.csv";
const LS_KEY = "flashcards_status_v1"; // stores status per card id

const unitSelect = document.getElementById("unitSelect");
const statsEl = document.getElementById("stats");
const frontText = document.getElementById("frontText");
const hint = document.getElementById("hint");
const showBtn = document.getElementById("showBtn");
const wrongBtn = document.getElementById("wrongBtn");
const rightBtn = document.getElementById("rightBtn");

let rows = [];
let byUnit = new Map();
let statusMap = loadStatus();
let currentUnit = "";
let currentQueue = [];
let currentCard = null;
let revealed = false;

function loadStatus() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}
function saveStatus() {
  localStorage.setItem(LS_KEY, JSON.stringify(statusMap));
}

function parseCSV(text) {
  // Simple CSV parser (handles commas + quotes reasonably).
  const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim().length);
  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const out = [];
  for (let i=1; i<lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => obj[h] = (cols[idx] ?? "").trim());
    if (obj.unit && obj.german && obj.spanish) out.push(obj);
  }
  return out;
}

function splitCSVLine(line) {
  const res = [];
  let cur = "";
  let inQ = false;
  for (let i=0; i<line.length; i++) {
    const ch = line[i];
    if (ch === '"' ) {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      res.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  res.push(cur);
  return res;
}

function cardId(r, idx) {
  // stable id: unit|german|spanish
  return `${r.unit}|||${r.german}|||${r.spanish}`;
}

function getStatus(id) {
  return statusMap[id] || "learn";
}
function setStatus(id, val) {
  statusMap[id] = val;
  saveStatus();
}

function buildUnits() {
  byUnit = new Map();
  rows.forEach((r, idx) => {
    const u = r.unit;
    const id = cardId(r, idx);
    const entry = { ...r, id };
    if (!byUnit.has(u)) byUnit.set(u, []);
    byUnit.get(u).push(entry);
  });

  unitSelect.innerHTML = "";
  [...byUnit.keys()].sort().forEach(u => {
    const opt = document.createElement("option");
    opt.value = u; opt.textContent = u;
    unitSelect.appendChild(opt);
  });

  currentUnit = unitSelect.value || [...byUnit.keys()][0] || "";
}

function rebuildQueue() {
  const list = byUnit.get(currentUnit) || [];
  // keep learn + retry, drop done
  currentQueue = list.filter(c => ["learn","retry"].includes(getStatus(c.id)));
  // shuffle
  for (let i=currentQueue.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [currentQueue[i], currentQueue[j]] = [currentQueue[j], currentQueue[i]];
  }
}

function updateStats() {
  const all = byUnit.get(currentUnit) || [];
  const done = all.filter(c => getStatus(c.id) === "done").length;
  statsEl.textContent = `${done}/${all.length} done`;
}

function showNextCard() {
  revealed = false;
  wrongBtn.disabled = true;
  rightBtn.disabled = true;
  showBtn.disabled = false;

  rebuildQueue();
  updateStats();

  if (currentQueue.length === 0) {
    frontText.textContent = "All done 🎉";
    hint.textContent = "Reset by clearing Safari website data or editing statuses in the CSV.";
    currentCard = null;
    showBtn.disabled = true;
    return;
  }

  currentCard = currentQueue[0];
  frontText.textContent = currentCard.german; // front = German
  hint.textContent = "Tap Show to reveal Spanish";
}

function reveal() {
  if (!currentCard) return;
  revealed = true;
  frontText.textContent = currentCard.spanish;
  hint.textContent = "Mark Right or Wrong";
  showBtn.disabled = true;
  wrongBtn.disabled = false;
  rightBtn.disabled = false;
}

function mark(val) {
  if (!currentCard) return;
  if (val === "right") setStatus(currentCard.id, "done");
  if (val === "wrong") setStatus(currentCard.id, "retry");
  showNextCard();
}

async function init() {
  const resp = await fetch(CSV_PATH, { cache: "no-store" });
  const text = await resp.text();
  rows = parseCSV(text);

  buildUnits();
  unitSelect.addEventListener("change", () => {
    currentUnit = unitSelect.value;
    showNextCard();
  });

  showBtn.addEventListener("click", reveal);
  wrongBtn.addEventListener("click", () => mark("wrong"));
  rightBtn.addEventListener("click", () => mark("right"));

  showNextCard();
}

init().catch(err => {
  frontText.textContent = "Error loading vocab.csv";
  hint.textContent = String(err);
});
