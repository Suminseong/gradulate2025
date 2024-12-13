from flask import Flask, request, jsonify
import json
from build_hum_jsonout import generate_user_personality
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

app = Flask(__name__)

# 로드된 JSON 데이터 파일 경로
EMOTION_FILE = 'emotion.json'
BEHAVIOR_FILE = 'behavior.json'
SOCIAL_FILE = 'social.json'

def load_data():
    """감정, 행동, 사회적 데이터 로드"""
    with open(EMOTION_FILE, 'r', encoding='utf-8') as file:
        emotion_data = json.load(file)
    with open(BEHAVIOR_FILE, 'r', encoding='utf-8') as file:
        behavior_data = json.load(file)
    with open(SOCIAL_FILE, 'r', encoding='utf-8') as file:
        social_data = json.load(file)
    return emotion_data, behavior_data, social_data

# 데이터 로드
emotion_data, behavior_data, social_data = load_data()

@app.route('/generate', methods=['POST'])
def generate_personality():
    """사용자의 입력 데이터를 받아 인격 데이터를 생성"""
    data = request.get_json()
    if not data or 'emotion' not in data or 'behavior' not in data:
        return jsonify({"error": "Invalid input. Provide 'emotion' and 'behavior' fields."}), 400

    input_emotion = data['emotion']
    input_behavior = data['behavior']

    try:
        # 인격 생성
        result = generate_user_personality(input_emotion, input_behavior)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/related_keywords', methods=['POST'])
def related_keywords():
    """선택된 감정 형용사로부터 관련 행동 및 사회적 키워드 반환"""
    data = request.get_json()
    if not data or 'selected_emotions' not in data:
        return jsonify({"error": "Invalid input. Provide 'selected_emotions' field."}), 400

    selected_emotions = data['selected_emotions']

    # 감정 데이터 임베딩 추출
    emotion_keywords = [item['emotion'] for item in emotion_data]
    emotion_vectors = np.array([item['embedding'] for item in emotion_data])

    # 행동 및 사회 데이터 임베딩 추출
    behavior_keywords = [item['word'] for item in behavior_data]
    behavior_vectors = np.array([item['embedding'] for item in behavior_data])

    social_keywords = [item['name'] for item in social_data]
    social_vectors = np.array([item['embedding'] for item in social_data])

    results = {}

    for emotion in selected_emotions:
        if emotion not in emotion_keywords:
            results[emotion] = {"error": f"'{emotion}' is not a valid emotion."}
            continue

        # 감정과 행동/사회 키워드 유사도 계산
        emotion_index = emotion_keywords.index(emotion)
        emotion_vector = emotion_vectors[emotion_index].reshape(1, -1)

        behavior_similarities = cosine_similarity(emotion_vector, behavior_vectors)[0]
        social_similarities = cosine_similarity(emotion_vector, social_vectors)[0]

        # 상위 3개의 키워드 선택
        top_behavior_indices = np.argsort(behavior_similarities)[-3:][::-1]
        top_social_indices = np.argsort(social_similarities)[-3:][::-1]

        top_behaviors = [behavior_keywords[i] for i in top_behavior_indices]
        top_socials = [social_keywords[i] for i in top_social_indices]

        results[emotion] = {
            "related_behaviors": top_behaviors,
            "related_socials": top_socials
        }

    return jsonify(results), 200

@app.route('/healthcheck', methods=['GET'])
def healthcheck():
    """서버 상태 확인"""
    return jsonify({"status": "Server is running."}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
