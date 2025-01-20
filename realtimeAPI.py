import os
import json
import base64
import time
from flask import Flask, request, jsonify, Response, send_from_directory
from websocket import create_connection, WebSocketConnectionClosedException
from flask_cors import CORS
from threading import Thread

# Flask 설정
app = Flask(__name__)
CORS(app)

# 환경 변수에서 API 키 가져오기
API_KEY = os.environ.get("OPENAI_API_KEY")
REALTIME_API_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17"

# WebSocket 연결 함수
def connect_to_realtime_api():
    try:
        ws = create_connection(
            REALTIME_API_URL,
            header=[
                f"Authorization: Bearer {API_KEY}",
                "OpenAI-Beta: realtime=v1"
            ],
            timeout=3
        )
        print("WebSocket connection established.")
        return ws
    except Exception as e:
        print(f"WebSocket connection failed: {e}")
        raise

# WebSocket 연결 유지 함수
def keep_connection_alive(ws):
    try:
        while ws.connected:
            ws.send(json.dumps({"type": "ping"}))
            print("Sent ping to WebSocket")
            time.sleep(3)
    except Exception as e:
        print(f"Ping failed: {e}")

# HTML 파일 제공
@app.route("/")
def serve_html():
    return send_from_directory(".", "apitestAPI.html")

# API 키 및 응답 저장 엔드포인트
@app.route("/save", methods=["POST"])
def save_data():
    data = request.json
    api_key = data.get("apiKey", "")
    gpt_response = data.get("gptResponse", "")

    if not api_key or not gpt_response:
        return jsonify({"error": "Missing data"}), 400

    print(f"API Key: {api_key}")
    print(f"GPT Response: {gpt_response}")

    # 필요한 경우 데이터 저장 로직 추가 가능
    return jsonify({"message": "Data saved successfully!"})

# 사용자 메시지 처리 엔드포인트
@app.route("/send", methods=["POST"])
def send_message():
    user_message = request.json.get("message", "")
    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    try:
        ws = connect_to_realtime_api()
        ping_thread = Thread(target=keep_connection_alive, args=(ws,), daemon=True)
        ping_thread.start()
    except Exception as e:
        return jsonify({"error": f"Failed to connect to WebSocket: {str(e)}"}), 500

    try:
        print(f"Sending message to WebSocket: {user_message}")
        ws.send(json.dumps({
            "type": "message",
            "role": "user",
            "content": user_message,
            "model": "gpt-4o-realtime-preview-2024-12-17"
        }))
        print("Message successfully sent to WebSocket.")

        def stream_response():
            try:
                while True:
                    response = ws.recv()
                    print(f"Full WebSocket response: {response}")

                    data = json.loads(response)
                    if data.get("type") == "response.audio":
                        audio_chunk = data.get("audioContent")
                        if audio_chunk:
                            decoded_audio = base64.b64decode(audio_chunk)
                            print(f"Decoded audio chunk size: {len(decoded_audio)} bytes")
                            yield decoded_audio
                        else:
                            print("audioContent is empty.")
                    else:
                        print(f"Unexpected response type: {data.get('type')}")
            except WebSocketConnectionClosedException as e:
                print(f"WebSocket connection closed unexpectedly: {e}")
                yield b""
            except Exception as e:
                print(f"Error in stream_response: {e}")
                yield b""

        return Response(stream_response(), content_type="audio/mpeg")
    except Exception as e:
        print(f"Error during WebSocket interaction: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        ws.close()

# Flask 서버 실행
if __name__ == "__main__":
    app.run(port=5000)
