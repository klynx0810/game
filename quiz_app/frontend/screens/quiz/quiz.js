const fs = window.require("fs");
const path = window.require("path");

// Lưu trạng thái mỗi câu: đáp án đúng + danh sách người đúng (avatar, username)
const answerHistory = {}; // { index: { correct: "A", players: [ {username, avatar} ] } }

// ===== Dùng lại WebSocket toàn cục =====
let ws = null;
// Cờ cho biết có đang lắng nghe câu trả lời realtime không
let isListening = false;
// Interval của đồng hồ đếm ngược
let interval = null;

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
  const c = answer.trim().charAt(0).toLowerCase();
  if (["a", "b", "c", "d"].includes(c)) return c;
  return null;
}

// ===== WS helpers =====
function sendToWS(payload, retries = 10) {
  const attempt = () => {
    const s = window.globalWS;
    if (s && s.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify(payload));
    } else if (retries > 0) {
      setTimeout(() => {
        retries--;
        attempt();
      }, 200);
    } else {
      console.warn("[Quiz] WS không OPEN sau khi retry:", payload);
    }
  };
  attempt();
}

function startListening() {
  if (isListening) return;
  sendToWS({ type: "start_listen" });
  isListening = true;
}

function stopListening() {
  if (!isListening) return;
  sendToWS({ type: "stop_listen" });
  isListening = false;
}

// Lắng nghe message từ global socket
window.addEventListener("ws-message", (event) => {
  // Nếu không trong trạng thái nghe (đang xem lại câu đã làm) thì bỏ qua
  if (!isListening) return;

  const msg = event.detail;
  if (msg.type === "answer") {
    const { username, avatar, answer } = msg.data;
    const choice = extractChoice(answer);
    if (choice) {
      onViewerChoose(choice.toUpperCase(), { username, avatar });
    }
  }
});

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
const questionText = document.getElementById("question-text");
const answerRows = document.querySelectorAll(".answer-row");
const timerBox = document.getElementById("timer-box");

// ===== Hàm thêm avatar =====
function addAvatarToChoice(choice, avatarUrl, username = "") {
  const avatarBox = document.getElementById("avatars" + choice);
  const img = document.createElement("img");
  img.src = avatarUrl;
  img.alt = username; // lưu username vào alt để serialize lại
  avatarBox.appendChild(img);
}

// ===== Hiển thị câu hỏi =====
function loadQuestion() {
  // Luôn dừng timer cũ & dừng nghe trước khi chuyển câu
  clearInterval(interval);
  stopListening();

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

  // Luôn reset giao diện về trạng thái đầy đủ 4 dòng (trước khi áp trạng thái câu đã làm)
  resetAnswersStyle();

  // Cập nhật text + ảnh cho các đáp án, đồng thời clear avatar cũ
  document.querySelectorAll(".answer-row").forEach((row) => {
    const choice = row.dataset.choice;
    const btn = row.querySelector(".answer-btn");
    const text = btn.querySelector(".answer-text");
    const img = btn.querySelector(".answer-img");
    const avatarBox = row.querySelector(".avatars");

    text.innerText = `${choice}. ${q.answers[choice] || ""}`;
    avatarBox.innerHTML = ""; // sẽ phục hồi lại nếu câu đã làm

    if (q.img_answers && q.img_answers[choice]) {
      img.src = q.img_answers[choice];
      img.style.display = "block";
    } else {
      img.style.display = "none";
    }
  });

  // Nếu câu này đã có lịch sử => KHÔNG đếm lại, KHÔNG gửi start_listen, chỉ phục hồi kết quả
  if (answerHistory[currentIndex]) {
    const { correct, players } = answerHistory[currentIndex];

    // Timer hiển thị 0
    timerBox.innerText = "0";

    // Tô đậm đáp án đúng, ẩn đáp án sai (không ghi đè history)
    revealAnswer(correct, { save: false });

    // Phục hồi avatar của người đúng và áp style nổi bật
    const correctRow = document.querySelector(`.answer-row[data-choice="${correct}"]`);
    if (correctRow && players) {
      const avatarBox = correctRow.querySelector(".avatars");
      avatarBox.innerHTML = "";
      players.forEach((p) => {
        const img = document.createElement("img");
        img.src = p.avatar;
        img.alt = p.username || "";
        avatarBox.appendChild(img);
      });
      // Áp style nổi bật như lúc reveal
      correctRow.querySelectorAll(".avatars img").forEach((a) => {
        a.style.display = "inline-block";
        a.style.transform = "scale(1.5) translateX(-10px)";
        a.style.transition = "transform 0.4s ease";
        a.style.filter = "drop-shadow(0 0 10px rgba(0,255,100,0.8))";
      });
    }

    // KHÔNG start timer, KHÔNG lắng nghe
    return;
  }

  // Câu mới -> bắt đầu đếm giờ & lắng nghe
  resetTimer(q.correct);
}

// ===== Hàm reset timer =====
function resetTimer(correctAnswer) {
  // Nếu câu hiện tại đã có kết quả thì bỏ qua: timer = 0, không nghe
  if (answerHistory[currentIndex]) {
    timerBox.innerText = "0";
    stopListening();
    return;
  }

  let time = 10;
  timerBox.innerText = String(time);

  const stateCode = window.globalWS ? window.globalWS.readyState : -1;
  const stateName = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][stateCode] || "NO_SOCKET";
  console.log("[Quiz] WS state:", stateName);

  // Bắt đầu nghe
  startListening();

  clearInterval(interval);
  interval = setInterval(() => {
    time--;
    timerBox.innerText = String(time);

    if (time <= 0) {
      clearInterval(interval);
      // Hết giờ -> dừng nghe và reveal
      stopListening();
      revealAnswer(correctAnswer, { save: true });
    }
  }, 1000);
}

// ===== Reveal đáp án đúng =====
// save=true: chỉ lưu history khi reveal thật sự (đang nghe)
// save=false: khi phục hồi hiển thị, KHÔNG ghi đè history
function revealAnswer(correctChoice, { save = true } = {}) {
  // Khi reveal -> không nhận thêm câu trả lời
  stopListening();

  // (Tạm) Thu thập players trước khi ẩn các dòng
  const players = [];
  const correctRowForSave = document.querySelector(`.answer-row[data-choice="${correctChoice}"]`);
  if (correctRowForSave) {
    correctRowForSave.querySelectorAll(".avatars img").forEach((img) => {
      players.push({ username: img.alt || "", avatar: img.src });
    });
  }
  if (save) {
    answerHistory[currentIndex] = { correct: correctChoice, players };
  }

  // Highlight đúng / ẩn sai
  answerRows.forEach((row) => {
    const choice = row.dataset.choice;
    const btn = row.querySelector(".answer-btn");
    const avatars = row.querySelector(".avatars");

    if (choice === correctChoice) {
      row.classList.add("correct");
      row.style.zIndex = "10";
      row.style.transform = "scale(1.15)";
      row.style.transition = "transform 0.4s ease, opacity 0.3s ease";
      btn.style.background = "rgba(0, 255, 100, 0.25)";
      btn.style.boxShadow = "0 0 35px rgba(0,255,100,0.7)";
      btn.style.borderRadius = "14px";

      avatars.querySelectorAll("img").forEach((a) => {
        a.style.display = "inline-block";
        a.style.transform = "scale(1.5) translateX(-10px)";
        a.style.transition = "transform 0.4s ease";
        a.style.filter = "drop-shadow(0 0 10px rgba(0,255,100,0.8))";
      });

      if (avatars.querySelectorAll("img").length === 0) {
        const msg = document.createElement("div");
        msg.innerText = "❌ Không ai chọn đúng";
        msg.style.color = "#ff8080";
        msg.style.fontSize = "16px";
        msg.style.fontWeight = "bold";
        msg.style.marginTop = "6px";
        msg.style.textShadow = "0 0 8px rgba(255,80,80,0.6)";
        avatars.appendChild(msg);
      }
    } else {
      row.style.opacity = "0";
      row.style.transition = "opacity 0.3s ease";
      setTimeout(() => {
        row.style.display = "none";
      }, 300);
    }
  });

  // Timer về 0 khi đã reveal
  timerBox.innerText = "0";
}

// ===== Reset giao diện khi đổi câu =====
function resetAnswersStyle() {
  answerRows.forEach((row) => {
    const btn = row.querySelector(".answer-btn");
    const avatars = row.querySelector(".avatars");

    row.classList.remove("correct");
    row.style.display = "flex";
    row.style.opacity = "1";
    row.style.transform = "scale(1)";
    row.style.zIndex = "1";
    btn.style.background = "transparent";
    btn.style.boxShadow = "none";

    avatars.querySelectorAll("img").forEach((a) => {
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
    loadQuestion(); // loadQuestion tự clear interval & stopListening
  }
});

// ====== Nút "Câu trước" ======
const btnPrev = document.getElementById("btnPrev");
if (btnPrev) {
  btnPrev.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      loadQuestion(); // loadQuestion tự clear interval & stopListening
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
  // Chỉ cho phép gắn avatar khi đang nghe (câu chưa kết thúc)
  if (!isListening) return;
  addAvatarToChoice(choice, hostData.avatar, hostData.username);
}

// ===== Gắn sự kiện cho các đáp án =====
answerRows.forEach((row) => {
  const btn = row.querySelector(".answer-btn");
  btn.addEventListener("click", () => {
    const choice = row.dataset.choice;
    onHostChoose(choice);
  });
});

// ===== Viewer từ server =====
function onViewerChoose(choice, viewer) {
  // Chỉ nhận khi đang lắng nghe
  if (!isListening) return;
  addAvatarToChoice(choice, viewer.avatar, viewer.username);
}

// ===== Khởi chạy =====
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
