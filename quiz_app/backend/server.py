import asyncio
import websockets
import json
import random

async def handler(websocket):
    print("Client connected")
    try:
        while True:
            # Giả lập một user comment chọn đáp án
            fake_event = {
                "user": f"user_{random.randint(1, 100)}",
                "avatar": "https://i.pravatar.cc/40",  # avatar random
                "answer": random.choice(["A", "B", "C", "D"])
            }
            await websocket.send(json.dumps(fake_event))
            await asyncio.sleep(3)  # mỗi 3s có 1 người comment
    except websockets.ConnectionClosed:
        print("Client disconnected")

async def main():
    async with websockets.serve(handler, "localhost", 8765):
        print("WebSocket server running at ws://localhost:8765")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
