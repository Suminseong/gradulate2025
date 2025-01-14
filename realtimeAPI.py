import os
import json
import base64
import time
from flask import Flask, request, jsonify, Response, send_from_directory
from websocket import create_connection, WebSocketConnectionClosedException
from flask_cors import CORS
from threading import Thread

app = Flask(__name__)
CORS(app)

# 환경 변수에서 API 키 가져오기
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
REALTIME_API_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17"

def connect_to_realtime_api():
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "OpenAI-Beta": "realtime=v1"
    }
    try:
        ws = create_connection(REALTIME_API_URL, header=headers, timeout=30)  # 타임아웃 설정
        print("WebSocket connection established.")
        return ws
    except Exception as e:
        print(f"WebSocket connection failed: {e}")
        raise

def keep_connection_alive(ws):
    try:
        while ws.connected:  # 연결 상태 확인
            ws.send(json.dumps({"type": "ping"}))
            print("Sent ping to WebSocket")
            time.sleep(30)  # 30초마다 핑
    except Exception as e:
        print(f"Ping failed: {e}")

@app.route("/")
def serve_html():
    return send_from_directory(".", "apitestAPI.html")

@app.route("/send", methods=["POST"])
def send_message():
    user_message = request.json.get("message", "")
    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    try:
        ws = connect_to_realtime_api()
        # 핑 스레드 시작
        ping_thread = Thread(target=keep_connection_alive, args=(ws,), daemon=True)
        ping_thread.start()
    except Exception as e:
        return jsonify({"error": f"Failed to connect to WebSocket: {str(e)}"}), 500

    try:
        # WebSocket에 사용자 메시지 전송
        print(f"Sending message to WebSocket: {user_message}")
        ws.send(json.dumps({
            "type": "message",
            "role": "user",
            "content": user_message,
            "model": "gpt-4o-realtime-preview-2024-12-17"  # 모델 필드 명시
        }))
        print("Message successfully sent to WebSocket.")

        # WebSocket 응답 스트리밍
        def stream_response():
            try:
                while True:
                    print("Waiting for WebSocket response...")
                    response = ws.recv()
                    print(f"Full WebSocket response: {response}")  # 전체 응답 확인

                    data = json.loads(response)
                    print(f"Parsed response data: {data}")  # JSON으로 파싱된 데이터 확인
                    if data.get("type") == "response.audio":
                        audio_chunk = data.get("audioContent")
                        if audio_chunk:
                            decoded_audio = base64.b64decode(audio_chunk)
                            print(f"Decoded audio chunk size: {len(decoded_audio)} bytes")
                            # 디버깅용 파일 저장
                            with open("debug_audio.mp3", "wb") as f:
                                f.write(decoded_audio)
                            yield decoded_audio
                        else:
                            print("audioContent is empty.")
                    else:
                        print(f"Unexpected response type: {data.get('type')}")
            except WebSocketConnectionClosedException as e:
                print(f"WebSocket connection closed unexpectedly: {e}")
                yield b""  # 빈 스트림 반환
            except Exception as e:
                print(f"Error in stream_response: {e}")
                yield b""  # 빈 스트림 반환

        return Response(stream_response(), content_type="audio/mpeg")
    except Exception as e:
        print(f"Error during WebSocket interaction: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        ws.close()

if __name__ == "__main__":
    app.run(port=5000)
