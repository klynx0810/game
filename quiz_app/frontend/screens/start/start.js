const fs = window.require("fs");
const path = window.require("path");

let bgImage = "frontend/assets/default_bg.jpg"; // fallback
const userDataPath = path.join(__dirname, "..", "..", "..", "user_data.json");

console.log("dataPath:", userDataPath);

if (fs.existsSync(userDataPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(userDataPath, "utf8"));
    if (data.background) {
      bgImage = data.background; // có thể là path hoặc base64
    }
  } catch (e) {
    console.error("Lỗi đọc background:", e);
  }
}

document.body.style.backgroundImage = `url("${bgImage}")`;
document.body.style.backgroundSize = "cover";
document.body.style.backgroundPosition = "center";

const dataDir = path.join(__dirname, "..", "..", "..", "data");
const container = document.getElementById("dataset-container");

function loadDatasets() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json"));
  container.innerHTML = "";

  files.forEach(file => {
    const fullPath = path.join(dataDir, file);
    let displayName = file.replace(".json", "");

    try {
      const raw = fs.readFileSync(fullPath, "utf8");
      const data = JSON.parse(raw);
      if (data.displayName) displayName = data.displayName;
    } catch {}

    const card = document.createElement("div");
    card.className = "dataset-card";
    card.innerText = displayName;

    card.addEventListener("click", () => {
      window.location.href = `../quiz_prepare/quiz_prepare.html?file=${file}`;
    });

    container.appendChild(card);
  });
}

document.getElementById("btnBackHome").addEventListener("click", () => {
  window.location.href = "../../index.html";
});

loadDatasets();
