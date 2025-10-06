import asyncio
import json
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, CommentEvent
from websocket_manager import WebSocketManager

class TikTokController:
    def __init__(self, username, ws_manager):
        self.client = TikTokLiveClient(unique_id=username)
        self.ws_manager = ws_manager
        self._listening = False

        # Khi kết nối thành công
        @self.client.on(ConnectEvent)
        async def on_connect(event: ConnectEvent):
            print(f"Kết nối tới @{event.unique_id} (Room ID: {self.client.room_id})")

        # Khi có comment
        @self.client.on(CommentEvent)
        async def on_comment(event: CommentEvent):
            if not self._listening:
                return

            text = event.comment.lower().strip()
            if any(opt in text for opt in ["a", "b", "c", "d"]):
                avatar_url = None
                try:
                    avatar_url = event.user.avatar_thumb.m_urls[0]
                except Exception:
                    avatar_url = ""

                data = {
                    "type": "answer",
                    "data": {
                        "username": event.user.nickname,
                        "avatar": avatar_url,
                        "answer": text
                    }
                }
                await self.ws_manager.send_request(data=data)


    def start_listening(self):
        self._listening = True

    def stop_listening(self):
        self._listening = False

    async def run(self):
        """Chạy client TikTokLive không chặn luồng chính"""
        await self.client.start()


async def main():
    # 1️⃣ Tạo WebSocket manager
    ws_manager = WebSocketManager()

    # 2️⃣ Tạo TikTok controller
    tiktok = TikTokController(username="@your_tiktok_id", ws_manager=ws_manager)

    # 3️⃣ Chạy song song WS server + TikTok listener
    await asyncio.gather(
        ws_manager.start_server(tiktok),
        tiktok.run()
    )


if __name__ == "__main__":
    asyncio.run(main())
