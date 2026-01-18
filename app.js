const CSV_URL = 'vocab.csv';
const LS_KEY = 'flashcard_progress';

const unitSelect = document.getElementById("unitSelect");
const cardText = document.getElementById("cardText");
const hintText = document.getElementById("hintText");
const showBtn = document.getElementById("showBtn");
const wrongBtn = document.getElementById("wrongBtn");
const rightBtn = document.getElementById("rightBtn");
const resetBtn = document.getElementById("resetBtn");
const progressText = document.getElementById("progressText");

let allCards = [];
let currentCards = [];
let currentCard = null;
let progress = loadProgress();
let revealed = false;

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }
  catch { return {}; }
}

function saveProgress() {
  localStorage.setItem(LS_KEY, JSON.stringify(progress));
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const parts = line.split(",");
    return {
      unit: parts[0],
      german: parts[1],
      spanish: parts[2],
      id: parts.join("||")
    };
  });
}

function buildUnits() {
  const units = [...new Set(allCards.map(c => c.unit))];
  unitSelect.innerHTML = "";
  units.forEach(unit => {
    const opt = document.createElement("option");
    opt.value = unit;
    opt.textContent = "Lektion " + unit;
    unitSelect.appendChild(opt);
  });
}

function filterCards() {
  const selectedUnit = unitSelect.value;
  const cards = allCards.filter(c => c.unit === selectedUnit);
  currentCards = cards.filter(c => progress[c.id] !== "done");
  shuffle(currentCards);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function showNextCard() {
  revealed = false;
  wrongBtn.disabled = true;
  rightBtn.disabled = true;
  showBtn.disabled = false;

  if (currentCards.length === 0) {
    cardText.textContent = "🎉 Alles erledigt!";
    hintText.textContent = "Super gemacht!";
    progressText.textContent = "";
    return;
  }

  currentCard = currentCards[0];
  cardText.textContent = currentCard.german;
  hintText.textContent = "Was heißt das auf Spanisch?";
  updateProgressText();
}

function revealAnswer() {
  if (!currentCard) return;
  cardText.textContent = currentCard.spanish;
  hintText.textContent = currentCard.german;
  revealed = true;
  wrongBtn.disabled = false;
  rightBtn.disabled = false;
  showBtn.disabled = true;
}

function mark(answer) {
  if (!currentCard) return;
  if (answer === "right") progress[currentCard.id] = "done";
  saveProgress();
  currentCards.shift();
  showNextCard();
}

function updateProgressText() {
  const total = allCards.filter(c => c.unit === unitSelect.value).length;
  const done = total - currentCards.length;
  progressText.textContent = `${done} von ${total} gelernt`;
}

function resetProgress() {
  if (confirm("Willst du wirklich alles zurücksetzen?")) {
    progress = {};
    saveProgress();
    filterCards();
    showNextCard();
  }
}

async function init() {
  const res = await fetch(CSV_URL);
  const text = await res.text();
  allCards = parseCSV(text);

  buildUnits();
  unitSelect.addEventListener("change", () => {
    filterCards();
    showNextCard();
  });

  showBtn.addEventListener("click", revealAnswer);
  wrongBtn.addEventListener("click", () => mark("wrong"));
  rightBtn.addEventListener("click", () => mark("right"));
  resetBtn.addEventListener("click", resetProgress);

  unitSelect.value = unitSelect.options[0]?.value;
  filterCards();
  showNextCard();
}

init();
