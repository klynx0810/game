// ===== Global WebSocket cho Quiz App =====
let socket = null;

function connectWebSocket() {
  // Khởi tạo WebSocket
  socket = new WebSocket("ws://localhost:8765");

  socket.onopen = () => {
    console.log("✅ [GlobalWS] Kết nối WebSocket thành công!");
    window.globalWS = socket;
    // Gửi event cho các file khác biết socket đã sẵn sàng
    window.dispatchEvent(new Event("global-ws-open"));
  };

  // 🔍 Theo dõi trạng thái WebSocket mỗi 2 giây
  setInterval(() => {
    if (!window.globalWS) {
      console.log("🔹 [GlobalWS] WS state: null (chưa khởi tạo)");
      return;
    }
    const s = window.globalWS.readyState;
    const states = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    console.log("🔹 [GlobalWS] WS state:", states[s]);
  }, 2000);


  socket.onmessage = (event) => {
    console.log("📩 [GlobalWS] Dữ liệu nhận được:", event.data);
    try {
      const data = JSON.parse(event.data);
      // Phát event toàn cục để quiz.js hoặc file khác lắng nghe
      const ev = new CustomEvent("ws-message", { detail: data });
      window.dispatchEvent(ev);
    } catch (err) {
      console.error("❌ [GlobalWS] Lỗi parse JSON:", err);
    }
  };

  socket.onerror = (error) => {
    console.error("❌ [GlobalWS] Lỗi WebSocket:", error);
  };

  socket.onclose = () => {
    console.log("🔴 [GlobalWS] Mất kết nối! Thử lại sau 3s...");
    window.globalWS = null;
    setTimeout(connectWebSocket, 3000);
  };
}

// ==== Bắt đầu kết nối WebSocket ====
connectWebSocket();
