from flask import Flask
from flask_sock import Sock
import json
import requests

app = Flask(__name__)
sock = Sock(app)

@sock.route('/ws')
def websocket(ws):
    while True:
        data = ws.receive()
        if data:
            try:
                # 수신된 JSON 데이터를 파싱
                parsed_data = json.loads(data)
                api_key = parsed_data.get('apiKey', 'N/A')
                gpt_response = parsed_data.get('gptResponse', 'N/A')

                print(f"Received API Key: {api_key}")
                print(f"Received GPT Response: {gpt_response}")

                # OpenAI API 요청 데이터
                url = "https://api.openai.com/v1/audio/speech"
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "tts-1",
                    "input": gpt_response,
                    "voice": "alloy"
                }

                # OpenAI API 호출
                response = requests.post(url, headers=headers, json=payload, stream=True)

                if response.status_code == 200:
                    print("Audio generation in progress...")
                    for chunk in response.iter_content(chunk_size=1024):
                        if chunk:
                            ws.send(chunk)  # WebSocket으로 청크 데이터를 전송
                    print("Audio streaming completed.")
                else:
                    print(f"Error from OpenAI API: {response.status_code}, {response.text}")
                    ws.send(json.dumps({"status": "error", "message": "Audio generation failed"}))
            except json.JSONDecodeError:
                print("Error: Received invalid JSON data")
            except Exception as e:
                print(f"Error generating or streaming audio: {e}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5500, debug=True)

# 메모-api_key 또 오류있음 벌써 몇번째니