import asyncio
import json
import websockets
import weakref
import os


class WebSocketManager:
    def __init__(self, host='localhost', port=8765):
        self.host = host
        self.port = port
        self.connected_clients = set()
        self.on_message_callback = None

    def on_message(self, func):
        """Đăng ký callback"""
        self.on_message_callback = func

    async def start_server(self):
        try:
            async with websockets.serve(self.websocket_handler, self.host, self.port):
                print(f"WebSocket server đang chạy tại ws://{self.host}:{self.port}")
                await asyncio.Future()  # Giữ server chạy vô hạn
        except asyncio.CancelledError:
            print("WebSocket server đã bị hủy.")

    async def websocket_handler(self, websocket):
        self.connected_clients.add(websocket)
        print("🌐Client đã kết nối")
        try:
            async for message in websocket:
                await self.process_message(message)
        except websockets.exceptions.ConnectionClosed:
            print("Client đã ngắt kết nối")
        finally:
            self.connected_clients.remove(websocket)

    async def process_message(self, message):
        """ Xử lý tin nhắn từ WebSocket client """
        data = json.loads(message)
        # print(f"📩 Nhận thông điệp: {data}")
        if self.on_message_callback:
            await self.on_message_callback(data)
        # msg_type = data.get("type")

        # if msg_type == "start_listen":
        #     print("▶️ Bắt đầu nhận comment TikTok")
        #     self.listening = True
        #     tiktok_controll.start_listening()
        # elif msg_type == "stop_listen":
        #     print("⏹ Dừng nhận comment TikTok")
        #     self.listening = False
        #     tiktok_controll.stop_listening()

    async def wait_for_clients(self):
        while not self.connected_clients:
            print("Đang chờ client kết nối...")
            await asyncio.sleep(1)

    async def send_to_clients(self, data):
        if self.connected_clients:
            message = json.dumps(data)
            await asyncio.gather(*(client.send(message) for client in self.connected_clients))
        else:
            print("Chưa có client nào kết nối, không gửi dữ liệu.")

    async def send_request(self, request_type=None, user_name=None, avatar=None, answer=None, data=None):
        await self.wait_for_clients()

        if data is None:
            data_send = {
                "type": request_type,
                "data": {
                    "username": user_name,
                    "avatar": avatar,
                    "answer": answer,
                }
            }
        elif isinstance(data, dict):
            data_send = data.copy()

            # Bổ sung type nếu có
            if request_type is not None:
                data_send["type"] = request_type

            # Bổ sung data con nếu có
            if "data" not in data_send or not isinstance(data_send["data"], dict):
                data_send["data"] = {}

            if user_name is not None:
                data_send["data"]["username"] = user_name
            if avatar is not None:
                data_send["data"]["avatar"] = avatar
            if answer is not None:
                data_send["data"]["answer"] = answer
        else:
            data_send = data

        await self.send_to_clients(data_send)


async def main():
    ws_manager = WebSocketManager()
    server_task = asyncio.create_task(ws_manager.start_server())

    fake_data = {
        "type": "answer",
        "data": {
            "username": "Tester",
            "avatar": "../../assets/default_avatar.png",
            "answer": "d"
        }
    }

    async def handle_msg(data):
        print("Nhận data:", data)
        msg_type = data.get("type")

        if msg_type == "start_listen":
            await ws_manager.send_request(data=fake_data)
            await asyncio.sleep(1)

            fake_data["data"]["answer"] = "a"
            await ws_manager.send_request(data=fake_data)

            await asyncio.sleep(1)
            fake_data["data"]["answer"] = "b"
            await ws_manager.send_request(data=fake_data)

            await asyncio.sleep(1)
            fake_data["data"]["answer"] = "b"
            await ws_manager.send_request(data=fake_data)

            await asyncio.sleep(1)
            fake_data["data"]["answer"] = "b"
            await ws_manager.send_request(data=fake_data)

            fake_data["data"]["answer"] = "c"
            await ws_manager.send_request(data=fake_data)
        

    ws_manager.on_message(handle_msg)
    
    await server_task

if __name__ == '__main__':
    asyncio.run(main())
