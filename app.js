let rows = [];
let byUnit = new Map();
let currentCards = [];
let currentIndex = 0;
let currentUnit = null;
let showGermanFirst = true;

fetch("vocab.csv")
  .then((r) => r.text())
  .then(init);

function init(csvText) {
  const lines = csvText.trim().split("\n");
  lines.shift(); // skip header
  rows = lines.map((line, i) => {
    const [grade, unit, german, spanish] = line.split(",");
    return {
      grade: grade.trim(),
      unit: unit.trim(),
      german: german.trim(),
      spanish: spanish.trim(),
      id: `${grade}|${unit}|${i}`,
    };
  });

  buildDropdowns();
  setupButtons();
}

function buildDropdowns() {
  const gradeUnits = new Map();

  rows.forEach((r) => {
    const key = `${r.grade}|${r.unit}`;
    if (!byUnit.has(key)) byUnit.set(key, []);
    byUnit.get(key).push(r);

    if (!gradeUnits.has(r.grade)) gradeUnits.set(r.grade, new Set());
    gradeUnits.get(r.grade).add(r.unit);
  });

  const gradeSelect = document.getElementById("gradeSelect");
  gradeSelect.innerHTML = "";
  [...gradeUnits.keys()].sort().forEach((grade) => {
    const opt = document.createElement("option");
    opt.value = grade;
    opt.textContent = `Klasse ${grade}`;
    gradeSelect.appendChild(opt);
  });

  gradeSelect.addEventListener("change", () => {
    updateUnitSelect(gradeSelect.value, gradeUnits);
  });

  updateUnitSelect(gradeSelect.value || [...gradeUnits.keys()][0], gradeUnits);
}

function updateUnitSelect(grade, gradeUnits) {
  const unitSelect = document.getElementById("unitSelect");
  unitSelect.innerHTML = "";

  const units = [...(gradeUnits.get(grade) || [])].sort();
  units.forEach((unit) => {
    const opt = document.createElement("option");
    opt.value = `${grade}|${unit}`;
    opt.textContent = unit;
    unitSelect.appendChild(opt);
  });

  unitSelect.addEventListener("change", () => {
    currentUnit = unitSelect.value;
    currentCards = byUnit.get(currentUnit).filter((c) => !getDone().includes(c.id));
    currentIndex = 0;
    updateCard();
  });

  unitSelect.dispatchEvent(new Event("change"));
}

function setupButtons() {
  document.getElementById("showBtn").addEventListener("click", () => {
    const card = currentCards[currentIndex];
    document.getElementById("hintText").textContent = showGermanFirst
      ? card.spanish
      : card.german;
    document.getElementById("rightBtn").disabled = false;
    document.getElementById("wrongBtn").disabled = false;
  });

  document.getElementById("rightBtn").addEventListener("click", () => {
    const card = currentCards[currentIndex];
    const done = getDone();
    if (!done.includes(card.id)) {
      done.push(card.id);
      localStorage.setItem("done", JSON.stringify(done));
    }
    nextCard();
  });

  document.getElementById("wrongBtn").addEventListener("click", nextCard);

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Bist du sicher, dass du deinen Fortschritt löschen willst?")) {
      localStorage.removeItem("done");
      updateCard();
    }
  });

  document.getElementById("langSwitchBtn").addEventListener("click", () => {
    showGermanFirst = !showGermanFirst;
    document.getElementById("langIcon").src = showGermanFirst
      ? "german to spanish.png"
      : "spanish to german.png";
    updateCard();
  });
}

function updateCard() {
  const cardText = document.getElementById("cardText");
  const hintText = document.getElementById("hintText");
  const showBtn = document.getElementById("showBtn");
  const rightBtn = document.getElementById("rightBtn");
  const wrongBtn = document.getElementById("wrongBtn");
  const progressText = document.getElementById("progressText");

  if (!currentCards || currentCards.length === 0) {
    cardText.textContent = "🎉 All done!";
    hintText.textContent = "Du kannst den Fortschritt im Speicher zurücksetzen.";
    showBtn.disabled = true;
    rightBtn.disabled = true;
    wrongBtn.disabled = true;
    progressText.textContent = "";
    return;
  }

  const card = currentCards[currentIndex];
  cardText.textContent = showGermanFirst ? card.german : card.spanish;
  hintText.textContent = showGermanFirst
    ? "Was heißt das auf Spanisch?"
    : "Wie heißt das auf Deutsch?";
  showBtn.disabled = false;
  rightBtn.disabled = true;
  wrongBtn.disabled = true;
  progressText.textContent = `${getDone().filter(id => id.startsWith(currentUnit)).length} von ${byUnit.get(currentUnit).length} gelernt`;
}

function nextCard() {
  currentIndex = (currentIndex + 1) % currentCards.length;
  updateCard();
}

function getDone() {
  return JSON.parse(localStorage.getItem("done") || "[]");
}
