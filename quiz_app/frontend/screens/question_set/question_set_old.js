const fs = window.require("fs");
const path = window.require("path");

// Đường dẫn đến user_data.json (ở ngoài thư mục frontend)
const dataPath = path.join(__dirname, "..", "..","..", "user_data.json");
// console.log("dataPath:", dataPath);
function loadData() {
  if (!fs.existsSync(dataPath)) {
    const def = {
      avatar: "frontend/assets/default_avatar.png",
      background: "frontend/assets/default_bg.jpg",
      questions: []
    };
    fs.writeFileSync(dataPath, JSON.stringify(def, null, 2), "utf8");
    return def;
  }
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
}

// ====== Quản lý câu hỏi ======
function loadQuestions() {
  const data = loadData();
  return data.questions || [];
}

function saveQuestions(questions) {
  const data = loadData();
  data.questions = questions;
  saveData(data);
}

function renderQuestions() {
  const tbody = document.getElementById("questionTableBody");
  tbody.innerHTML = "";
  const questions = loadQuestions();

  questions.forEach((q, idx) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        ${idx + 1}. ${q.q}
        <button class="delete-btn" data-index="${idx}">X</button>
      </td>
    `;

    // Chọn dòng để edit
    row.addEventListener("click", (e) => {
      if (e.target.classList.contains("delete-btn")) return;

      [...tbody.querySelectorAll("tr")].forEach(tr => tr.classList.remove("selected"));
      row.classList.add("selected");

      document.getElementById("qText").value = q.q;
      document.getElementById("ansA").value = q.answers.A;
      document.getElementById("ansB").value = q.answers.B;
      document.getElementById("ansC").value = q.answers.C;
      document.getElementById("ansD").value = q.answers.D;
      document.getElementById("correct").value = q.correct;
      document.getElementById("btnSave").dataset.editIndex = idx;
    });

    // Nút xoá riêng
    row.querySelector(".delete-btn").addEventListener("click", () => {
      const newQs = loadQuestions();
      newQs.splice(idx, 1);
      saveQuestions(newQs);
      renderQuestions();
      if (document.getElementById("btnSave").dataset.editIndex == idx) {
        clearForm();
      }
    });

    tbody.appendChild(row);
  });
}

function clearForm() {
  document.getElementById("qText").value = "";
  document.getElementById("ansA").value = "";
  document.getElementById("ansB").value = "";
  document.getElementById("ansC").value = "";
  document.getElementById("ansD").value = "";
  document.getElementById("correct").value = "A";
  delete document.getElementById("btnSave").dataset.editIndex;
}

// ====== Nút back ======
document.getElementById("btnBack").addEventListener("click", () => {
  window.location.href = "../../index.html";
});

function showError(msg, focusId) {
  const modal = document.getElementById("errorModal");
  const msgBox = document.getElementById("errorMessage");
  const closeBtn = document.getElementById("btnCloseError");

  msgBox.innerText = msg;
  modal.classList.remove("hidden");

  closeBtn.onclick = () => {
    modal.classList.add("hidden");
    if (focusId) {
      document.getElementById(focusId).focus(); // ✅ focus lại ô bị thiếu
    }
  };
}

// ====== Nút save (thêm hoặc sửa) ======
document.getElementById("btnSave").addEventListener("click", () => {
  const q = document.getElementById("qText").value;
  const A = document.getElementById("ansA").value;
  const B = document.getElementById("ansB").value;
  const C = document.getElementById("ansC").value;
  const D = document.getElementById("ansD").value;
  const correct = document.getElementById("correct").value;

  if (!q || !A || !B || !C || !D) {
    // alert("⚠️ Vui lòng nhập đầy đủ!");
  
    if (!q) showError("⚠️ Vui lòng nhập câu hỏi!", "qText");
    else if (!A) showError("⚠️ Vui lòng nhập đáp án A!", "ansA");
    else if (!B) showError("⚠️ Vui lòng nhập đáp án B!", "ansB");
    else if (!C) showError("⚠️ Vui lòng nhập đáp án C!", "ansC");
    else if (!D) showError("⚠️ Vui lòng nhập đáp án D!", "ansD");

    return;
  }

  const questions = loadQuestions();

  if (document.getElementById("btnSave").dataset.editIndex !== undefined) {
    const idx = parseInt(document.getElementById("btnSave").dataset.editIndex);
    questions[idx] = { q, answers: { A, B, C, D }, correct };
    delete document.getElementById("btnSave").dataset.editIndex;
  } else {
    questions.push({ q, answers: { A, B, C, D }, correct });
  }

  saveQuestions(questions);
  renderQuestions();
  clearForm();
});

// ====== Nút xoá tất cả ======
document.getElementById("btnDeleteAll").addEventListener("click", () => {
  if (confirm("Bạn có chắc chắn muốn xoá toàn bộ câu hỏi?")) {
    const data = loadData();
    data.questions = [];
    saveData(data);
    renderQuestions();
    clearForm();
  }
});

// Render khi mở trang
renderQuestions();
