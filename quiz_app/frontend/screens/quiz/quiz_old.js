const fs = window.require("fs");
const path = window.require("path");

// ===== Dùng lại WebSocket toàn cục =====
let ws = null;

function getGlobalWS() {
  return window.globalWS;
}

// Khi kết nối WS mở
window.addEventListener("global-ws-open", () => {
  ws = window.globalWS;
  console.log("✅ WS đã sẵn sàng trong quiz.js");
});

// Đảm bảo lấy lại nếu socket đã mở từ trước
if (window.globalWS && window.globalWS.readyState === WebSocket.OPEN) {
  ws = window.globalWS;
}

function extractChoice(answer) {
  if (!answer) return null;
  // Lấy ký tự đầu tiên (bỏ khoảng trắng, chuyển sang chữ thường)
  const c = answer.trim().charAt(0).toLowerCase();
  // Chỉ chấp nhận a/b/c/d
  if (["a", "b", "c", "d"].includes(c)) return c;
  return null;
}

// Lắng nghe message từ global socket
window.addEventListener("ws-message", (event) => {
  const msg = event.detail;
  if (msg.type === "answer") {
    const { username, avatar, answer } = msg.data;
    const choice = extractChoice(answer);
    if (choice) {
      onViewerChoose(choice.toUpperCase(), { username, avatar });
    }
  }
});

function sendToWS(payload, retries=10) {
  const attempt = () => {
    const s = window.globalWS;
    if (s && s.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify(payload));
    } else if (retries > 0) {
      setTimeout(() => { retries--; attempt(); }, 200);
    } else {
      console.warn("[Quiz] WS không OPEN sau khi retry:", payload);
    }
  };
  attempt();
}


// ===== Đọc background =====
let bgImage = "frontend/assets/default_bg.jpg";
const userDataPath1 = path.join(__dirname, "..", "..", "..", "user_data.json");

if (fs.existsSync(userDataPath1)) {
  try {
    const data = JSON.parse(fs.readFileSync(userDataPath1, "utf8"));
    if (data.background) bgImage = data.background;
  } catch (e) {
    console.error("Lỗi đọc background:", e);
  }
}

document.body.style.backgroundImage = `url("${bgImage}")`;
document.body.style.backgroundSize = "cover";
document.body.style.backgroundPosition = "center";

// ===== Đọc file câu hỏi =====
const urlParams = new URLSearchParams(window.location.search);
const datasetFile = urlParams.get("file");
const dataDir = path.join(__dirname, "..", "..", "..", "data");
const currentFile = datasetFile ? path.join(dataDir, datasetFile) : null;

let dataset = { displayName: "?", questions: [] };
if (currentFile && fs.existsSync(currentFile)) {
  dataset = JSON.parse(fs.readFileSync(currentFile, "utf8"));
}

// ===== Load avatar chủ phòng =====
let hostData = { username: "Chủ phòng", avatar: "../../assets/default_avatar.png" };
const userDataPath = path.join(__dirname, "..", "..", "user_data.json");
if (fs.existsSync(userDataPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(userDataPath, "utf8"));
    if (data.avatar) hostData.avatar = data.avatar;
    if (data.username) hostData.username = data.username;
  } catch (e) {
    console.error("Lỗi đọc user_data.json:", e);
  }
}

// ===== Biến toàn cục =====
let currentIndex = 0;
let interval;
const questionText = document.getElementById("question-text");
const answerRows = document.querySelectorAll(".answer-row");
const timerBox = document.getElementById("timer-box");

// ===== Hàm thêm avatar =====
function addAvatarToChoice(choice, avatarUrl) {
  const avatarBox = document.getElementById("avatars" + choice);
  const img = document.createElement("img");
  img.src = avatarUrl;
  img.alt = ""; // bỏ chữ "Chủ phòng"
  // img.onerror = () => { img.style.display = "none"; };
  avatarBox.appendChild(img);
}

// ===== Hiển thị câu hỏi =====
function loadQuestion() {
  if (currentIndex >= dataset.questions.length) {
    questionText.innerText = "🎉 Hết câu hỏi!";
    document.getElementById("answers").style.display = "none";
    document.getElementById("btnNext").style.display = "none";
    document.getElementById("btnPrev").style.display = "none";
    document.getElementById("timer-box").style.display = "none";
    return;
  }

  const q = dataset.questions[currentIndex];
  questionText.innerText = q.q || "";

  // Ảnh câu hỏi
  const qImg = document.getElementById("question-image");
  if (q.q_img) {
    qImg.src = q.q_img;
    qImg.style.display = "block";
  } else {
    qImg.src = "";
    qImg.style.display = "none";
  }

  // Reset style
  resetAnswersStyle();

  // Đáp án
  document.querySelectorAll(".answer-row").forEach(row => {
    const choice = row.dataset.choice;
    const btn = row.querySelector(".answer-btn");
    const text = btn.querySelector(".answer-text");
    const img = btn.querySelector(".answer-img");
    const avatarBox = row.querySelector(".avatars");

    text.innerText = `${choice}. ${q.answers[choice] || ""}`;
    avatarBox.innerHTML = ""; // clear avatar cũ

    if (q.img_answers && q.img_answers[choice]) {
      img.src = q.img_answers[choice];
      img.style.display = "block";
    } else {
      img.style.display = "none";
    }
  });

  // Reset timer mỗi lần load câu
  resetTimer(q.correct);
}

// ===== Hàm reset timer =====
function resetTimer(correctAnswer) {
  let time = 10;
  timerBox.innerText = time;
  // console.log(window.globalWS, window.globalWS.readyState)
  const stateCode = window.globalWS ? window.globalWS.readyState : -1;
  const stateName = ["CONNECTING","OPEN","CLOSING","CLOSED"][stateCode] || "NO_SOCKET";
  console.log("[Quiz] WS state:", stateName);

  // 🔹 Gửi lệnh start_listen khi câu bắt đầu
  if (ws && ws.readyState === WebSocket.OPEN) {
    // ws.send(JSON.stringify({ type: "start_listen" }));
    sendToWS({ type: "start_listen" });
  }

  clearInterval(interval);
  interval = setInterval(() => {
    time--;
    timerBox.innerText = time;
    if (time <= 0) {
      clearInterval(interval);

      // 🔹 Khi hết giờ thì dừng backend
      if (ws && ws.readyState === WebSocket.OPEN) {
        // ws.send(JSON.stringify({ type: "stop_listen" }));
        sendToWS({ type: "stop_listen"  });
      }

      revealAnswer(correctAnswer);
    }
  }, 1000);
}

// ===== Reveal đáp án đúng =====
function revealAnswer(correctChoice) {
  answerRows.forEach(row => {
    const choice = row.dataset.choice;
    const btn = row.querySelector(".answer-btn");
    const avatars = row.querySelector(".avatars");

    if (choice === correctChoice) {
      // Hiển thị câu đúng — màu xanh lá + phóng to
      row.classList.add("correct");
      row.style.zIndex = "10";
      row.style.transform = "scale(1.15)";
      row.style.transition = "transform 0.4s ease, opacity 0.3s ease";
      btn.style.background = "rgba(0, 255, 100, 0.25)";
      btn.style.boxShadow = "0 0 35px rgba(0,255,100,0.7)";
      btn.style.borderRadius = "14px";

      // Phóng to và làm nổi bật avatar của dòng đúng
      avatars.querySelectorAll("img").forEach(a => {
        a.style.display = "inline-block";
        a.style.transform = "scale(1.5) translateX(-10px)";
        a.style.transition = "transform 0.4s ease";
        a.style.filter = "drop-shadow(0 0 10px rgba(0,255,100,0.8))";
      });

    } else {
      // Ẩn toàn bộ đáp án sai
      row.style.opacity = "0";
      row.style.transition = "opacity 0.3s ease";
      setTimeout(() => {
        row.style.display = "none";
      }, 300);
    }
  });
}


// ===== Reset giao diện khi đổi câu =====
function resetAnswersStyle() {
  answerRows.forEach(row => {
    const btn = row.querySelector(".answer-btn");
    const avatars = row.querySelector(".avatars");

    row.classList.remove("correct");
    row.style.display = "flex";
    row.style.opacity = "1";
    row.style.transform = "scale(1)";
    row.style.zIndex = "1";
    btn.style.background = "transparent";
    btn.style.boxShadow = "none";

    avatars.querySelectorAll("img").forEach(a => {
      a.style.display = "inline-block";
      a.style.transform = "scale(1) translateX(0)";
      a.style.filter = "none";
    });
  });
}


// ====== Nút "Câu tiếp theo" ======
document.getElementById("btnNext").addEventListener("click", () => {
  if (currentIndex < dataset.questions.length - 1) {
    currentIndex++;
    clearInterval(interval);
    loadQuestion();
  }
});

// ====== Nút "Câu trước" ======
const btnPrev = document.getElementById("btnPrev");
if (btnPrev) {
  btnPrev.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      clearInterval(interval);
      loadQuestion();

      // 🔹 Khi chuyển câu thì tự động gửi start_listen mới
      if (ws && ws.readyState === WebSocket.OPEN) {
        // ws.send(JSON.stringify({ type: "start_listen" }));
        sendToWS({ type: "start_listen" });
      }
    }
  });
}

// ====== Nút "Về trang chủ" ======
const btnHome = document.getElementById("btnHome");
if (btnHome) {
  btnHome.addEventListener("click", () => {
    window.location.href = "../../index.html";
  });
}

// ===== Chủ phòng chọn đáp án =====
function onHostChoose(choice) {
  addAvatarToChoice(choice, hostData.avatar, hostData.username);
}

// ===== Gắn sự kiện cho các đáp án =====
answerRows.forEach(row => {
  const btn = row.querySelector(".answer-btn");
  btn.addEventListener("click", () => {
    const choice = row.dataset.choice;
    onHostChoose(choice);
  });
});

// ===== Viewer từ server =====
function onViewerChoose(choice, viewer) {
  addAvatarToChoice(choice, viewer.avatar, viewer.username);
}

// ===== Khởi chạy =====
// loadQuestion();
if (window.globalWS && window.globalWS.readyState === WebSocket.OPEN) {
  console.log("🌐 WS đã sẵn sàng, bắt đầu quiz ngay");
  ws = window.globalWS;
  loadQuestion();
} else {
  console.log("⏳ Đang chờ WS sẵn sàng trước khi load quiz...");
  window.addEventListener("global-ws-open", () => {
    ws = window.globalWS;
    console.log("✅ WS đã sẵn sàng, bắt đầu load quiz");
    loadQuestion();
  });
}
