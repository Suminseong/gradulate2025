from flask import Flask, request, jsonify
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import json
import chardet

# Flask App Initialization
app = Flask(__name__)

# Load Data with Encoding Detection
def load_json_with_encoding(file_path):
    with open(file_path, 'rb') as f:
        raw_data = f.read()
        detected_encoding = chardet.detect(raw_data)['encoding']
    with open(file_path, 'r', encoding=detected_encoding) as f:
        return json.load(f)

emotion_data = load_json_with_encoding('emotion.json')
behavior_data = load_json_with_encoding('behavior.json')
social_data = load_json_with_encoding('social.json')

# Helper Function to Compute Similarity
def find_similar_keywords(input_keywords, dataset, top_n=3):
    input_embeddings = [item['embedding'] for item in dataset if item['word'] in input_keywords]
    dataset_embeddings = np.array([item['embedding'] for item in dataset])

    if not input_embeddings:
        return []

    input_mean_embedding = np.mean(input_embeddings, axis=0).reshape(1, -1)
    similarities = cosine_similarity(input_mean_embedding, dataset_embeddings).flatten()
    top_indices = np.argsort(similarities)[-top_n:][::-1]

    return [dataset[idx]['word'] for idx in top_indices]

# API Endpoint
@app.route('/recommend', methods=['POST'])
def recommend():
    try:
        data = request.json
        if 'keywords' not in data or not isinstance(data['keywords'], list) or len(data['keywords']) != 3:
            return jsonify({"error": "Invalid input. Provide exactly 3 keywords in a list."}), 400

        keywords = data['keywords']

        # Find Recommendations
        recommended_emotions = find_similar_keywords(keywords, emotion_data)
        recommended_socials = find_similar_keywords(keywords, social_data)

        return jsonify({
            "input_keywords": keywords,
            "recommended_emotions": recommended_emotions,
            "recommended_socials": recommended_socials
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Main Execution
if __name__ == '__main__':
    app.run(debug=True)
