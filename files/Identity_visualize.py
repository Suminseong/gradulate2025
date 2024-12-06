import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import PCA

# 예제 데이터 (키워드와 384차원 임베딩)
keywords = ["assertive", "confident", "calm", "angry", "hopeful", "sad", "joyful"]
vectors = np.random.rand(len(keywords), 384)  # 384차원 임베딩 예제 데이터

# 특정 키워드와 유사한 키워드만 선택
def get_similar_keywords(target_word, similarity_threshold=0.7):
    if target_word not in keywords:
        return f"'{target_word}' is not in the dataset."
    
    # 유사도 계산
    target_index = keywords.index(target_word)
    target_vector = vectors[target_index].reshape(1, -1)
    similarities = cosine_similarity(target_vector, vectors)[0]
    
    # 유사도가 임계값 이상인 키워드 필터링 (본인 제외)
    similar_keywords = [
        (keywords[i], similarities[i]) 
        for i in range(len(similarities)) 
        if similarities[i] >= similarity_threshold and i != target_index
    ]
    return similar_keywords

# 예제 실행
target_keyword = "assertive"
selected_keywords = get_similar_keywords(target_keyword, similarity_threshold=0.7)

# 선택된 키워드만 필터링
selected_keyword_names = [kw[0] for kw in selected_keywords] + [target_keyword]
selected_indices = [keywords.index(kw) for kw in selected_keyword_names]
filtered_vectors = vectors[selected_indices]

# PCA로 차원 축소
pca = PCA(n_components=2)
reduced_vectors = pca.fit_transform(filtered_vectors)

# 시각화
plt.figure(figsize=(12, 8))
for i, keyword in enumerate(selected_keyword_names):
    if keyword == target_keyword:
        plt.scatter(reduced_vectors[i, 0], reduced_vectors[i, 1], color='red', label=f"Target: {keyword}", s=100)
    else:
        plt.scatter(reduced_vectors[i, 0], reduced_vectors[i, 1], label=keyword)

# 키워드 라벨 추가
for i, keyword in enumerate(selected_keyword_names):
    plt.annotate(keyword, (reduced_vectors[i, 0], reduced_vectors[i, 1]), fontsize=10)

# 그래프 스타일 설정
plt.title(f"Keywords Similar to '{target_keyword}'")
plt.xlabel("PCA Dimension 1")
plt.ylabel("PCA Dimension 2")
plt.legend()
plt.grid()
plt.show()
