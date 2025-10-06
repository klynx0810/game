import asyncio
import json
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, CommentEvent
from websocket_manager import WebSocketManager


class TikTokController:
    def __init__(self, username, ws_manager: WebSocketManager):
        self.client = TikTokLiveClient(unique_id=username)
        self.ws_manager = ws_manager
        self._listening = False
        self.answered_users = set()  # 🟢 lưu user_id đã trả lời

        @self.client.on(ConnectEvent)
        async def on_connect(event: ConnectEvent):
            print(f"✅ Kết nối tới @{event.unique_id} (Room ID: {self.client.room_id})")

        @self.client.on(CommentEvent)
        async def on_comment(event: CommentEvent):
            if not self._listening:
                return

            text = event.comment.lower().strip()
            if text in ["a", "b", "c", "d"]:
                user_id = event.user.user_id

                # 🟠 Nếu user đã chọn rồi thì bỏ qua
                if user_id in self.answered_users:
                    return

                # 🟢 Lưu lại user này
                self.answered_users.add(user_id)

                avatar_url = ""
                try:
                    avatar_url = event.user.avatar_thumb.m_urls[0]
                except Exception:
                    pass

                data = {
                    "type": "answer",
                    "data": {
                        "username": event.user.nick_name,
                        "avatar": avatar_url,
                        "answer": text
                    }
                }
                await self.ws_manager.send_request(data=data)

    def start_listening(self):
        print("▶️ Bắt đầu nhận comment TikTok")
        self._listening = True
        self.answered_users.clear()  # 🔄 reset lại danh sách người chơi mới

    def stop_listening(self):
        print("⏹ Dừng nhận comment TikTok")
        self._listening = False

    async def run(self):
        """Chạy client TikTokLive"""
        await self.client.start()


async def main():
    # 1️⃣ Tạo WebSocket server
    ws_manager = WebSocketManager()

    # 2️⃣ Tạo TikTok controller
    tiktok = TikTokController(username="yaya_8108", ws_manager=ws_manager)

    # 3️⃣ Gắn callback xử lý message từ frontend
    async def handle_ws_message(data):
        msg_type = data.get("type")
        if msg_type == "start_listen":
            tiktok.start_listening()
        elif msg_type == "stop_listen":
            tiktok.stop_listening()

    ws_manager.on_message(handle_ws_message)

    # 4️⃣ Chạy song song TikTok + WebSocket
    await asyncio.gather(
        ws_manager.start_server(),
        tiktok.run()
    )


if __name__ == "__main__":
    asyncio.run(main())
