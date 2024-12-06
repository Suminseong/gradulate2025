from sklearn.metrics.pairwise import cosine_similarity
from sklearn.manifold import TSNE
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sentence_transformers import SentenceTransformer

# 데이터 준비
keywords = [
    "assertive", "passive", "aggressive", "persuasive", "informative", "direct",
    "indirect", "formal", "informal", "eloquent", "inarticulate", "polite",
    "rude", "empathetic", "sarcastic", "humorous", "serious", "questioning",
    "answering", "supportive", "critical", "encouraging", "dismissive",
    "curious", "reserved", "expressive", "collaborative", "competitive",
    "argumentative", "defensive", "neutral", "emotional", "analytical",
    "imaginative", "practical", "optimistic", "pessimistic", "hesitant",
    "authoritative", "friendly", "detached", "open-minded", "close-minded",
    "detailed", "vague", "consistent", "contradictory", "dominant", "submissive",
    "logical", "irrational", "fluent", "stuttering", "repetitive", "original",
    "thoughtful", "impulsive", "diplomatic", "blunt", "cautious", "reckless",
    "cheerful", "melancholic", "timid", "passive-aggressive", "affirmative",
    "denying", "apologetic", "boastful", "directive", "discouraging",
    "respectful", "disrespectful", "articulate", "ambiguous", "fact-focused",
    "opinionated", "storytelling", "explaining", "arguing", "reflective",
    "introspective", "constructive", "joking", "teasing", "complaining",
    "praising", "modest", "arrogant", "cooperative", "demanding", "offensive",
    "enthusiastic", "indifferent", "self-deprecating", "ambitious", "lazy",
    "objective", "subjective", "accurate", "exaggerating", "humble", "overconfident"
]

# 임베딩 생성
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(keywords)

# 유사도 계산
similarity_matrix = cosine_similarity(embeddings)

# 유사도 행렬을 DataFrame으로 변환
similarity_df = pd.DataFrame(similarity_matrix, index=keywords, columns=keywords)

# t-SNE로 차원 축소
tsne = TSNE(n_components=2, random_state=42, perplexity=30, n_iter=300)
tsne_results = tsne.fit_transform(embeddings)

# 결과 시각화: Heatmap
plt.figure(figsize=(10, 8))
plt.imshow(similarity_matrix, cmap='viridis', aspect='auto')
plt.colorbar()
plt.title("Keyword Similarity Heatmap")
plt.xlabel("Keywords")
plt.ylabel("Keywords")
plt.xticks(ticks=np.arange(len(keywords)), labels=keywords, rotation=90, fontsize=8)
plt.yticks(ticks=np.arange(len(keywords)), labels=keywords, fontsize=8)
plt.tight_layout()
plt.show()

# 결과 시각화: t-SNE
plt.figure(figsize=(12, 8))
plt.scatter(tsne_results[:, 0], tsne_results[:, 1], alpha=0.8)
for i, word in enumerate(keywords):
    plt.text(tsne_results[i, 0], tsne_results[i, 1], word, fontsize=8)
plt.title("t-SNE Visualization of Keyword Embeddings")
plt.xlabel("Dimension 1")
plt.ylabel("Dimension 2")
plt.grid(True)
plt.show()
