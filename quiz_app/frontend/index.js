// ====== Node modules (renderer) ======
const fs   = window.require("fs");
const path = window.require("path");

// ====== Elements ======
const app        = document.getElementById("app");
const avatarImg  = document.getElementById("avatarImg");
const btnChange  = document.getElementById("btnChange");
const changeMenu = document.getElementById("changeMenu");
const fileInput  = document.getElementById("fileInput");

// ====== Đường dẫn tới user_data.json (ngang hàng thư mục frontend/) ======
const dataPath = path.join(__dirname, "..", "user_data.json");

// ====== Đọc / ghi JSON ======
function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return null; }
}
function writeJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

// ====== Áp dữ liệu ra UI ======
function setBackground(val) {
  if (typeof val === "string" && val.startsWith("url(")) {
    app.style.backgroundImage = val;
  } else {
    app.style.backgroundImage = `url("${val}")`;
  }
  app.style.backgroundSize = "cover";       // luôn phủ kín
  app.style.backgroundPosition = "center";  // căn giữa
  app.style.backgroundRepeat = "no-repeat"; // không lặp
  app.style.backgroundColor = "black";      // tránh viền hở
}


// ====== Fallback loader cho avatar (PNG -> JPG) ======
function setDefaultAvatar() {
  const candidates = ["assets/default_avatar.png", "assets/default_avatar.jpg"];
  let i = 0;
  const tryNext = () => {
    if (i >= candidates.length) return console.warn("Không tìm thấy default avatar");
    avatarImg.onerror = () => { i++; tryNext(); };
    avatarImg.onload  = () => {};
    avatarImg.src     = candidates[i];
  };
  tryNext();
}

// ====== Fallback loader cho background (JPG -> PNG) ======
function setDefaultBackground() {
  const candidates = ["assets/default_bg.jpg", "assets/default_bg.png"];
  let i = 0;
  const tryNext = () => {
    if (i >= candidates.length) return console.warn("Không tìm thấy default background");
    const url = candidates[i];
    const test = new Image();
    test.onload  = () => setBackground(url);
    test.onerror = () => { i++; tryNext(); };
    test.src     = url;
  };
  tryNext();
}

// ====== Khởi tạo data ======
function ensureDataFile() {
  if (!fs.existsSync(dataPath)) {
    const def = {
      avatar: "frontend/assets/default_avatar.png",
      background: "frontend/assets/default_bg.jpg",
      questions: []
    };
    writeJSON(dataPath, def);
    return def;
  }
  return readJSON(dataPath) || {
    avatar: "frontend/assets/default_avatar.png",
    background: "frontend/assets/default_bg.jpg",
    questions: []
  };
}

let data = ensureDataFile();

// Load vào UI (nếu path lỗi, dùng fallback)
(function applyData() {
  let okAvatar = true;
  avatarImg.onerror = () => { okAvatar = false; setDefaultAvatar(); };
  avatarImg.src = data.avatar;

  setBackground(data.background);
  // nếu background path hỏng, fallback sẽ tự xử lý khi chạy setDefaultBackground thủ công
  const bgProbe = new Image();
  bgProbe.onerror = () => setDefaultBackground();
  bgProbe.src = data.background.startsWith("url(")
    ? data.background.slice(5, -2) // rút URL trong url("...")
    : data.background;
})();

// ====== Toggle menu đổi ảnh ======
btnChange.addEventListener("click", (e) => {
  e.stopPropagation();
  changeMenu.classList.toggle("hidden");
});

// Click ngoài menu -> đóng
document.addEventListener("click", () => changeMenu.classList.add("hidden"));

// Chọn mục trong menu -> mở file picker
changeMenu.addEventListener("click", (e) => {
  const item = e.target.closest(".menu-item");
  if (!item) return;
  fileInput.dataset.target = item.dataset.target; // "avatar" | "bg"
  changeMenu.classList.add("hidden");
  fileInput.click();
});

// ====== Xử lý chọn file ảnh (avatar hoặc background) ======
fileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const dataUrl = evt.target.result;  // base64 của ảnh
    const target  = fileInput.dataset.target;

    if (target === "avatar") {
      avatarImg.src = dataUrl;
      data.avatar   = dataUrl;
    } else if (target === "bg") {
      setBackground(dataUrl);
      data.background = dataUrl;
    }
    writeJSON(dataPath, data);         // ✅ lưu lại
    fileInput.value = "";              // reset
  };
  reader.readAsDataURL(file);
});

// ====== Demo 2 nút ======
// document.getElementById("btnQuestion").addEventListener("click", () => {
//   console.log("Question click");
//   alert("👉 Viết câu hỏi (sau này mở form)");
// });
// document.getElementById("btnStart").addEventListener("click", () => {
//   console.log("Start click");
//   alert("👉 Bắt đầu quiz (sau này chạy countdown)");
// });

document.getElementById("btnQuestion").addEventListener("click", () => {
  window.location.href = "screens/question/question.html";
});


document.getElementById("btnStart").addEventListener("click", () => {
  window.location.href = "screens/start/start.html";
});