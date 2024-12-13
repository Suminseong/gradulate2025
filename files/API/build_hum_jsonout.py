import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import random

# JSON 파일 로드
with open('files/API/emotion.json', 'r') as file:
    emotion_data = json.load(file)

with open('files/API/behavior.json', 'r') as file:
    behavior_data = json.load(file)

# 키워드와 임베딩 병합
emotion_keywords = [item['word'] for item in emotion_data]
emotion_vectors = np.array([item['embedding'] for item in emotion_data])

behavior_keywords = [item['word'] for item in behavior_data]
behavior_vectors = np.array([item['embedding'] for item in behavior_data])

# 유사 키워드 확률 기반 선택 (3개)
def get_similar_keywords_with_weights(target_word, keywords, vectors, top_n=5, select_n=3):
    if target_word not in keywords:
        return f"'{target_word}' is not in the dataset."
    
    # 유사도 계산
    target_index = keywords.index(target_word)
    target_vector = vectors[target_index].reshape(1, -1)
    similarities = cosine_similarity(target_vector, vectors)[0]
    
    # 상위 N개 유사 키워드 선택
    similar_indices = np.argsort(similarities)[-top_n:][::-1]
    similar_keywords = [(keywords[i], similarities[i]) for i in similar_indices]
    
    # 확률 기반 선택 (가중치 부여)
    total_similarity = sum(sim[1] for sim in similar_keywords)
    probabilities = [sim[1] / total_similarity for sim in similar_keywords]
    selected_keywords = random.choices(
        [(sim[0], round(sim[1] * 100 / total_similarity, 2)) for sim in similar_keywords], 
        weights=probabilities, 
        k=select_n
    )
    
    return selected_keywords

# 사용자 인격 데이터 생성
def generate_user_personality(input_emotion, input_behavior, top_n=5, select_n=3):
    # 유사 키워드 확률 기반 선택
    selected_emotions = get_similar_keywords_with_weights(
        input_emotion, emotion_keywords, emotion_vectors, top_n, select_n
    )
    selected_behaviors = get_similar_keywords_with_weights(
        input_behavior, behavior_keywords, behavior_vectors, top_n, select_n
    )
    
    # 사용자 인격 데이터 생성
    user_personality = {
        "input": {
            "emotion": input_emotion,
            "behavior": input_behavior
        },
        "generated": {
            "emotions": selected_emotions,
            "behaviors": selected_behaviors
        }
    }
    return user_personality

# 예제 실행
input_emotion = "joyful"
input_behavior = "assertive"

user_personality = generate_user_personality(input_emotion, input_behavior)
print("Generated User Personality:", user_personality)

# 결과 저장
with open('user_personality.json', 'w') as file:
    json.dump(user_personality, file, indent=4, ensure_ascii=False)

print("User personality saved to 'user_personality.json'.")
