from flask import Flask, request, jsonify
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import json
import chardet

# Flask 앱 초기화
app = Flask(__name__)

# 인코딩 자동 감지로 데이터 로드
# 인코딩 읽는데 오류가 있어서 이 코드는 지우거나 수정하면 안되비낟
# 분명 json 파일이 utf8로 잘 맹그러져 있는데 왜 이상한 형태로 읽어들이는가에 대하여...
def load_json_with_encoding(file_path):
    # 파일을 바이너리 모드로 열어 인코딩 감지
    with open(file_path, 'rb') as f:
        raw_data = f.read()
        detected_encoding = chardet.detect(raw_data)['encoding']  # chardet로 인코딩 탐지
    # 탐지된 인코딩으로 파일 읽기
    with open(file_path, 'r', encoding=detected_encoding) as f:
        return json.load(f)

# json 파일 로드
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
            return json.dumps({"error": "입력값을 3개로 맞추시오."}, ensure_ascii=False), 400

        keywords = data['keywords']

        # 입력 키워드 뭔지 말하기 출력
        print(f"입력한 키워드는: {keywords}")

        # 추천 계산
        recommended_emotions = find_similar_keywords(keywords, emotion_data)
        recommended_socials = find_similar_keywords(keywords, social_data)

        # 디버깅: 추천 결과 출력
        print(f"Recommended Emotions: {recommended_emotions}")
        print(f"Recommended Socials: {recommended_socials}")

        # 추천 결과 반환
        return json.dumps({
            "입력한 키워드는": keywords,  # 입력받은 키워드
            "유사한 감정은": recommended_emotions,  # 추천된 감정 키워드
            "유사한 사회적 키워드는": recommended_socials  # 추천된 사회적 키워드
        }, ensure_ascii=False)

    except Exception as e:
        # 오류 메시지 반환으로 예외처리
        return json.dumps({"error": str(e)}, ensure_ascii=False), 500

# 메인 실행
if __name__ == '__main__':
    # Flask 서버 디버그 모드로 실행
    app.run(debug=True)

# 관측된 문제점
# social.json에서는 유사도가 안 가져와지는 문제가 잇어요
# 대체 어디서 가져오는건지 모르겠는데 입력값이 그대로 튀어나오고 잇어요
# 입력값은 제외시키기, 입력값은 emotion.json에서만 가져오기, 출력값은 behavior.json, social.json에서만 각각 독립해서 가져오기를 해야할 것 같은데 잘 몰?루겠어요
# 유사도에 따라 가져오는 값 더 테스트 해야 할 것 같아요우

# 우옹애