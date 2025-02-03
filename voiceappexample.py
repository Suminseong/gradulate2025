from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import json
import os
import sys
from vosk import Model, KaldiRecognizer

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# VOSK 모델 초기화
model_path = "model_vosk"  
if not os.path.exists(model_path):
    print("VOSK 모델이 필요합니다. 모델을 다운로드 받아 'model' 폴더에 압축 해제하세요.")
    sys.exit(1)

model = Model(model_path)
# 16kHz 오디오 기준으로 인식기를 생성
recognizer = KaldiRecognizer(model, 16000)
recognizer.SetWords(True)

# 누적된 텍스트 (데모 목적이라 단순 누적 처리)
vosk_text = ""
kaldi_text = ""
others_text = ""

@socketio.on('connect')
def handle_connect():
    print("클라이언트 연결됨")
    emit('message', {'data': '서버와 연결되었습니다.'})

@socketio.on('audio')
def handle_audio(data):
    global vosk_text, kaldi_text, others_text
    if recognizer.AcceptWaveform(data):
        result = recognizer.Result()
        result_json = json.loads(result)
        text = result_json.get("text", "")
        if text.strip() != "":
            # 
            vosk_text += text + " "
            kaldi_text += text + " "
            others_text += text + " "
            # broadcast
            emit('result', {
                'vosk': vosk_text,
                'kaldi': kaldi_text,
                'others': others_text
            }, broadcast=True)
    else:
        pass

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    socketio.run(app, port=5000, debug=True)
