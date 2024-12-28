from flask import Flask, request, jsonify
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import json
import chardet

# Flask 앱 초기화
app = Flask(__name__)

# 인코딩 자동 감지로 데이터 로드
def load_json_with_encoding(file_path):
    # 파일을 바이너리 모드로 열어 인코딩 감지
    with open(file_path, 'rb') as f:
        raw_data = f.read()
        detected_encoding = chardet.detect(raw_data)['encoding']  # chardet로 인코딩 탐지
    # 탐지된 인코딩으로 파일 읽기
    with open(file_path, 'r', encoding=detected_encoding) as f:
        return json.load(f)

# 감정, 행동, 사회 데이터를 JSON 파일에서 로드
emotion_data = load_json_with_encoding('emotion.json')
behavior_data = load_json_with_encoding('behavior.json')
social_data = load_json_with_encoding('social.json')

# 유사 키워드 계산을 위한 헬퍼 함수
def find_similar_keywords(input_keywords, dataset, top_n=3):
    # 입력 키워드를 소문자로 정규화
    normalized_input_keywords = [kw.strip().lower() for kw in input_keywords]
    # 데이터셋에서 입력 키워드와 매칭되는 임베딩 추출
    input_embeddings = [item['embedding'] for item in dataset if item.get('meaning_ko', '').strip().lower() in normalized_input_keywords]
    dataset_embeddings = np.array([item['embedding'] for item in dataset])

    # 매칭된 임베딩이 없을 경우 빈 리스트 반환
    if not input_embeddings:
        return []

    # 입력 키워드의 평균 임베딩 계산
    input_mean_embedding = np.mean(input_embeddings, axis=0).reshape(1, -1)
    # 코사인 유사도로 유사도 계산
    similarities = cosine_similarity(input_mean_embedding, dataset_embeddings).flatten()
    # 유사도 상위 n개의 인덱스를 가져와 정렬
    top_indices = np.argsort(similarities)[-top_n:][::-1]

    # 디버깅: 유사도와 매칭된 키워드 출력
    matched_keywords = [dataset[idx]['meaning_ko'] for idx in top_indices]
    print(f"Similarities: {similarities}")  # 각 데이터의 유사도 출력
    print(f"Matched Keywords: {matched_keywords}")  # 상위 매칭 키워드 출력

    return matched_keywords


# API 엔드포인트 정의
@app.route('/recommend', methods=['POST'])
def recommend():
    try:
        # 클라이언트로부터 JSON 데이터 받기
        data = request.json
        # 입력 검증: 키워드가 3개인지 확인
        if 'keywords' not in data or not isinstance(data['keywords'], list) or len(data['keywords']) != 3:
            return json.dumps({"error": "Invalid input. Provide exactly 3 keywords in a list."}, ensure_ascii=False), 400

        keywords = data['keywords']

        # 디버깅: 입력 키워드 출력
        print(f"Input Keywords: {keywords}")

        # 추천 계산
        recommended_emotions = find_similar_keywords(keywords, emotion_data)
        recommended_socials = find_similar_keywords(keywords, social_data)

        # 디버깅: 추천 결과 출력
        print(f"Recommended Emotions: {recommended_emotions}")
        print(f"Recommended Socials: {recommended_socials}")

        # 추천 결과 반환
        return json.dumps({
            "input_keywords": keywords,  # 입력받은 키워드
            "recommended_emotions": recommended_emotions,  # 추천된 감정 키워드
            "recommended_socials": recommended_socials  # 추천된 사회적 키워드
        }, ensure_ascii=False)

    except Exception as e:
        # 예외 처리: 오류 메시지 반환
        return json.dumps({"error": str(e)}, ensure_ascii=False), 500

# 메인 실행
if __name__ == '__main__':
    # Flask 서버 디버그 모드로 실행
    app.run(debug=True)
