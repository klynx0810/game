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

const urlParams = new URLSearchParams(window.location.search);
const datasetFile = urlParams.get("file");

const dataDir = path.join(__dirname, "..", "..", "..", "data");
const currentFile = datasetFile ? path.join(dataDir, datasetFile) : null;

let dataset = { displayName: "?", questions: [] };
if (currentFile && fs.existsSync(currentFile)) {
  dataset = JSON.parse(fs.readFileSync(currentFile, "utf8"));
}

document.getElementById("datasetName").innerText = dataset.displayName;

// render danh sách câu hỏi
const list = document.getElementById("question-list");
dataset.questions.forEach((q, i) => {
  const div = document.createElement("div");
  div.className = "question-item";
  div.innerText = i + 1;   // chỉ hiện số thứ tự
  list.appendChild(div);
});

// nút bắt đầu
document.getElementById("btnStartQuiz").addEventListener("click", () => {
  window.location.href = `../quiz/quiz.html?file=${datasetFile}`;
});
