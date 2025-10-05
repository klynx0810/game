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

// ====== Lấy file bộ đề từ query string ======
const urlParams = new URLSearchParams(window.location.search);
const datasetFile = urlParams.get("file");

const dataDir = path.join(__dirname, "..", "..", "..", "data");
let currentFile = datasetFile ? path.join(dataDir, datasetFile) : null;

// ====== Đảm bảo file tồn tại ======
function ensureDatasetFile() {
  if (!currentFile) return;
  if (!fs.existsSync(currentFile)) {
    const initData = { displayName: "Bộ mới", questions: [] };
    fs.writeFileSync(currentFile, JSON.stringify(initData, null, 2), "utf8");
  }
}
ensureDatasetFile();

// ====== Load & Save dataset ======
function loadDataset() {
  if (!currentFile) return { displayName: "?", questions: [] };
  try {
    const raw = fs.readFileSync(currentFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return { displayName: "?", questions: [] };
  }
}

function saveDataset(dataset) {
  if (!currentFile) return;
  fs.writeFileSync(currentFile, JSON.stringify(dataset, null, 2), "utf8");
}

// ====== Render danh sách câu hỏi ======
function renderQuestions() {
  const dataset = loadDataset();
  const tbody = document.getElementById("questionTableBody");
  tbody.innerHTML = "";

  dataset.questions.forEach((q, idx) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${idx + 1}. ${q.q}</td>
      <td><button class="delete-btn">X</button></td>
    `;

    // chọn để sửa
    row.addEventListener("click", (e) => {
      if (e.target.classList.contains("delete-btn")) return;

      ["qImageInput", "imgA", "imgB", "imgC", "imgD"].forEach(id => imageData[id] = "");

      [...tbody.querySelectorAll("tr")].forEach(tr => tr.classList.remove("selected"));
      row.classList.add("selected");

      document.getElementById("qText").value = q.q;
      document.getElementById("ansA").value = q.answers.A;
      document.getElementById("ansB").value = q.answers.B;
      document.getElementById("ansC").value = q.answers.C;
      document.getElementById("ansD").value = q.answers.D;
      document.getElementById("correct").value = q.correct;

      document.getElementById("qImagePreview").src = q.q_img || "";
      document.getElementById("qImagePreview").style.display = q.q_img ? "block" : "none";
      
      if (q.q_img) {
        const delQ = document.querySelector('.btn-del[data-target="qImageInput"]');
        if (delQ) delQ.style.display = "inline-block";
      }
      
      ["A","B","C","D"].forEach(choice => {
        const prev = document.getElementById("preview" + choice);
        prev.src = q.img_answers?.[choice] || "";
        prev.style.display = q.img_answers?.[choice] ? "block" : "none";

        const delBtn = document.querySelector(`.btn-del[data-target="img${choice}"]`);
        if (q.img_answers?.[choice]) {
          delBtn.style.display = "inline-block";
        } else {
          delBtn.style.display = "none";
        }
      });

      document.getElementById("btnSave").dataset.editIndex = idx;
    });

    // nút xoá câu
    row.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const ds = loadDataset();
      ds.questions.splice(idx, 1);
      saveDataset(ds);
      renderQuestions();
      if (document.getElementById("btnSave").dataset.editIndex == idx) {
        clearForm();
      }
    });

    tbody.appendChild(row);
  });
}

// ====== Clear form ======
function clearForm() {
  // Xóa text câu hỏi và đáp án
  document.getElementById("qText").value = "";
  document.getElementById("ansA").value = "";
  document.getElementById("ansB").value = "";
  document.getElementById("ansC").value = "";
  document.getElementById("ansD").value = "";
  document.getElementById("correct").value = "A";

  // Xóa toàn bộ ảnh và preview
  const imageIds = ["qImageInput", "imgA", "imgB", "imgC", "imgD"];
  imageIds.forEach(id => {
    const input = document.getElementById(id);
    const preview = id === "qImageInput"
      ? document.getElementById("qImagePreview")
      : document.getElementById("preview" + id.slice(-1));
    const delBtn = document.querySelector(`.btn-del[data-target="${id}"]`);

    // Reset input file
    if (input) input.value = "";

    // Ẩn preview
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }

    // Ẩn nút xoá ảnh
    if (delBtn) delBtn.style.display = "none";

    // Xoá dữ liệu base64 trong imageData
    if (typeof imageData !== "undefined") imageData[id] = "";
  });

  // Xoá index đang sửa (nếu có)
  delete document.getElementById("btnSave").dataset.editIndex;
}


function readImageAsBase64(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => callback(e.target.result);
  reader.readAsDataURL(file);
}

const imageInputs = [
  { input: "qImageInput", preview: "qImagePreview" },
  { input: "imgA", preview: "previewA" },
  { input: "imgB", preview: "previewB" },
  { input: "imgC", preview: "previewC" },
  { input: "imgD", preview: "previewD" },
];

const imageData = {}; // lưu tạm base64 ảnh

imageInputs.forEach(({ input, preview }) => {
  const inp = document.getElementById(input);
  const imgPrev = document.getElementById(preview);
  inp.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    readImageAsBase64(file, (base64) => {
      imageData[input] = base64;
      imgPrev.src = base64;
      imgPrev.style.display = "block";

      // Hiện nút xoá
      const delBtn = document.querySelector(`.btn-del[data-target="${input}"]`);
      if (delBtn) delBtn.style.display = "inline-block";
    });
  });
});

// ====== Xử lý nút xoá ảnh ======
document.querySelectorAll(".btn-del").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    const imgPrev = document.getElementById(
      target === "qImageInput" ? "qImagePreview" : "preview" + target.slice(-1)
    );
    const inp = document.getElementById(target);

    // Reset dữ liệu
    if (imgPrev) {
      imgPrev.src = "";
      imgPrev.style.display = "none";
    }
    inp.value = "";
    imageData[target] = "";
    btn.style.display = "none";
  });
});


// ====== Nút Save ======
document.getElementById("btnSave").addEventListener("click", () => {
  const q = document.getElementById("qText").value.trim();
  const A = document.getElementById("ansA").value.trim();
  const B = document.getElementById("ansB").value.trim();
  const C = document.getElementById("ansC").value.trim();
  const D = document.getElementById("ansD").value.trim();
  const correct = document.getElementById("correct").value;

  const hasQuestionText = q && q.trim() !== "";
  const hasQuestionImage = !!imageData.qImageInput;
  
  // Nếu không có cả text lẫn ảnh câu hỏi
  if (!hasQuestionText && !hasQuestionImage) {
    const errorModal = document.getElementById("errorModal");
    const errorMessage = document.getElementById("errorMessage");
    errorMessage.innerText = "⚠️ Vui lòng nhập câu hỏi hoặc chọn ảnh câu hỏi!";
    errorModal.classList.remove("hidden");
    return;
  }
  
  // Kiểm tra đáp án A–D bắt buộc phải có text
  if (!A || !B || !C || !D) {
    const errorModal = document.getElementById("errorModal");
    const errorMessage = document.getElementById("errorMessage");
    errorMessage.innerText = "⚠️ Vui lòng nhập đủ 4 đáp án (A, B, C, D)!";
    errorModal.classList.remove("hidden");
    return;
  }  

  const dataset = loadDataset();

  const q_img = imageData.qImageInput || "";
  const img_answers = {
    A: imageData.imgA || "",
    B: imageData.imgB || "",
    C: imageData.imgC || "",
    D: imageData.imgD || "",
  };

  const newQ = { q, q_img, answers: { A, B, C, D }, img_answers, correct };

  if (document.getElementById("btnSave").dataset.editIndex !== undefined) {
    const idx = parseInt(document.getElementById("btnSave").dataset.editIndex);
    dataset.questions[idx] = newQ;
    delete document.getElementById("btnSave").dataset.editIndex;
  } else {
    dataset.questions.push(newQ);
  }

  saveDataset(dataset);
  renderQuestions();
  clearForm();
});


// ====== Nút xoá tất cả câu ======
const confirmModal = document.getElementById("confirmDeleteModal");
const btnYes = document.getElementById("btnConfirmDeleteYes");
const btnNo = document.getElementById("btnConfirmDeleteNo");

document.getElementById("btnDeleteAll").addEventListener("click", () => {
  confirmModal.classList.remove("hidden");
});

btnYes.addEventListener("click", () => {
  const ds = loadDataset();
  ds.questions = [];
  saveDataset(ds);
  renderQuestions();
  clearForm();
  confirmModal.classList.add("hidden");
});

btnNo.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
});

// ====== Nút xoá bộ đề ======
const confirmDatasetModal = document.getElementById("confirmDeleteDatasetModal");
const btnYesDataset = document.getElementById("btnConfirmDeleteDatasetYes");
const btnNoDataset = document.getElementById("btnConfirmDeleteDatasetNo");

document.getElementById("btnDeleteDataset").addEventListener("click", () => {
  confirmDatasetModal.classList.remove("hidden");
});

btnYesDataset.addEventListener("click", () => {
  if (currentFile && fs.existsSync(currentFile)) {
    try {
      fs.unlinkSync(currentFile);
    } catch (err) {
      console.error("Lỗi xoá bộ đề:", err);
    }
  }
  confirmDatasetModal.classList.add("hidden");
  window.location.href = "../question/question.html";
});

btnNoDataset.addEventListener("click", () => {
  confirmDatasetModal.classList.add("hidden");
});

// ====== Nút Back ======
document.getElementById("btnBack").addEventListener("click", () => {
  window.location.href = "../question/question.html";
});

document.getElementById("btnCloseError").addEventListener("click", () => {
  document.getElementById("errorModal").classList.add("hidden");
});
// ====== Init ======
renderQuestions();
