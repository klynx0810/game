const fs = window.require("fs");
const path = window.require("path");

let bgImage = "frontend/assets/default_bg.jpg"; // fallback
const userDataPath = path.join(__dirname, "..", "..", "..", "user_data.json");

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

// ====== Hàm chuẩn hóa tên file ======
function toSafeFileName(str) {
  const from = "áàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ";
  const to   = "aaaaaaaaaaaaaaaaadeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyy";
  str = str.toLowerCase();
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const idx = from.indexOf(str[i]);
    result += idx > -1 ? to[idx] : str[i];
  }
  return result.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

// ====== Load danh sách bộ đề ======
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
      window.location.href = `../question_set/question_set.html?file=${file}`;
    });

    container.appendChild(card);
  });
}

// ====== Modal tạo bộ mới ======
const modal = document.getElementById("newDatasetModal");
const inputName = document.getElementById("newDatasetName");
const btnCreate = document.getElementById("btnCreateDataset");
const btnCancel = document.getElementById("btnCancelDataset");

document.getElementById("btnNewDataset").addEventListener("click", () => {
  modal.classList.remove("hidden");
  inputName.value = "";
  inputName.focus();
});

btnCancel.addEventListener("click", () => {
  modal.classList.add("hidden");
});

btnCreate.addEventListener("click", () => {
  const name = inputName.value.trim();
  if (!name) return;

  const safeName = toSafeFileName(name);
  const newFile = path.join(dataDir, `${safeName}.json`);
  if (fs.existsSync(newFile)) {
    alert("⚠️ Bộ đề đã tồn tại!");
    return;
  }

  const initData = { displayName: name, questions: [] };
  fs.writeFileSync(newFile, JSON.stringify(initData, null, 2), "utf8");

  modal.classList.add("hidden");
  loadDatasets();
});

// ====== Init ======
loadDatasets();

document.getElementById("btnBackHome").addEventListener("click", () => {
  window.location.href = "../../index.html"; 
  // chỉnh lại path tùy index.html của bạn ở đâu
});
