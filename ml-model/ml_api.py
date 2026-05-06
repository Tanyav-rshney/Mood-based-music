"""
╔══════════════════════════════════════════════════════════════╗
║  🎵 NeonPulse ML API — Mood-Based Music Recommendation     ║
║  Flask server that uses NLP + ML to detect mood from text   ║
║  and return song recommendations from Spotify dataset.      ║
║                                                              ║
║  Flow: Frontend → Node.js → THIS Flask API → Response       ║
╚══════════════════════════════════════════════════════════════╝

How it works:
1. User types how they're feeling (e.g., "I feel so happy today!")
2. Text is cleaned (lowercase, remove punctuation, remove stopwords)
3. First, a rule-based sentiment lexicon checks for mood keywords
4. If no keywords found, TF-IDF + Logistic Regression ML model predicts mood
5. Mood is mapped to dataset categories and songs are returned

Supported moods: happy, sad, angry, calm, energetic, romantic, excited, anxious
"""

# ═══════════════════════════════════════════════════════════
#  IMPORTS
# ═══════════════════════════════════════════════════════════
import os
import pandas as pd
import numpy as np
import nltk
import re
import warnings
import json

warnings.filterwarnings("ignore")

from flask import Flask, request, jsonify
from flask_cors import CORS

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# ═══════════════════════════════════════════════════════════
#  STEP 1: Download NLTK data (runs once, then cached)
# ═══════════════════════════════════════════════════════════
nltk.download('punkt', quiet=True)
nltk.download('punkt_tab', quiet=True)
nltk.download('stopwords', quiet=True)

print("[OK] NLTK data ready")

# ═══════════════════════════════════════════════════════════
#  STEP 2: Load the Spotify songs dataset
# ═══════════════════════════════════════════════════════════
# The CSV file must be in the same folder as this script
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "spotify_songs.csv")

try:
    df = pd.read_csv(CSV_PATH)
    print(f"[OK] Dataset loaded! Shape: {df.shape}")
    print(f"   Columns: {list(df.columns)[:10]}...")
except FileNotFoundError:
    print(f"[ERROR] 'spotify_songs.csv' not found at {CSV_PATH}")
    print("   Please download it from the GitHub repo and place it in the ml-model/ folder.")
    raise

# ═══════════════════════════════════════════════════════════
#  STEP 3: Create 'mood' column from audio features
# ═══════════════════════════════════════════════════════════
# Spotify provides 'valence' (positivity) and 'energy' (intensity)
# We use these to classify each song into a mood category


def assign_mood(row):
    """
    Classify a song's mood based on Spotify audio features:
    - valence: musical positiveness (0=sad, 1=happy)
    - energy: intensity and activity (0=calm, 1=energetic)
    
    Mood zones:
    - happy:     high valence (>=0.7) + high energy (>=0.7)
    - energetic: moderate-high valence (>=0.45) + very high energy (>=0.8)
    - romantic:  moderate valence (0.4-0.6) + moderate energy (0.5-0.75)
    - sad:       low valence (<=0.4) + low energy (<=0.5)
    - angry:     low valence (<=0.4) + high energy (>=0.6)
    - calm:      moderate-high valence (>=0.5) + low energy (<=0.45)
    """
    try:
        valence = float(row['valence'])
        energy = float(row['energy'])
    except (ValueError, TypeError):
        return 'calm'

    # Happy: upbeat, positive, high-energy party songs
    if valence >= 0.7 and energy >= 0.7:
        return 'happy'
    # Angry: dark but intense
    elif valence <= 0.4 and energy >= 0.6:
        return 'angry'
    # Sad: low positivity, low energy
    elif valence <= 0.4 and energy <= 0.5:
        return 'sad'
    # Calm: positive but gentle
    elif valence >= 0.5 and energy <= 0.45:
        return 'calm'
    # Romantic: moderate valence + moderate energy (love songs, emotional melodies)
    elif 0.4 <= valence <= 0.6 and 0.5 <= energy <= 0.75:
        return 'romantic'
    # Energetic: everything else with high energy
    elif energy >= 0.75:
        return 'energetic'
    # Romantic fallback for moderate songs
    elif 0.4 <= valence <= 0.6:
        return 'romantic'
    else:
        return 'energetic'


# Generate mood column if it doesn't exist
if 'mood' not in df.columns:
    if 'valence' in df.columns and 'energy' in df.columns:
        df['mood'] = df.apply(assign_mood, axis=1)
        print("[OK] Mood column generated from valence & energy!")
    else:
        moods_list = ['happy', 'sad', 'angry', 'calm', 'energetic', 'romantic']
        df['mood'] = np.random.choice(moods_list, size=len(df))
        print("[WARN] No valence/energy found. Assigned random moods.")
else:
    df['mood'] = df['mood'].str.lower().str.strip()
    print("[OK] Existing mood column normalized.")

# Fix column names — try common alternatives
column_mapping = {
    'track_name': ['song', 'title', 'name', 'song_name', 'Song Name'],
    'track_artist': ['artist', 'singer', 'artist_name', 'Artist'],
}
for target_col, alternatives in column_mapping.items():
    if target_col not in df.columns:
        for alt in alternatives:
            if alt in df.columns:
                df.rename(columns={alt: target_col}, inplace=True)
                break
        if target_col not in df.columns:
            df[target_col] = 'Unknown'

# Rename 'artist_name' to 'track_artist' if needed
if 'artist_name' in df.columns and 'track_artist' not in df.columns:
    df.rename(columns={'artist_name': 'track_artist'}, inplace=True)

print(f"\n[STATS] Mood distribution:\n{df['mood'].value_counts().to_string()}\n")

# ═══════════════════════════════════════════════════════════
#  STEP 4: Train the ML model (NLP text → mood classification)
# ═══════════════════════════════════════════════════════════
# Training data: hand-crafted sentences for each mood
mood_sentences = {
    'happy': [
        "I am feeling very happy and joyful today",
        "I feel great excited and cheerful",
        "feeling fantastic and on top of the world",
        "today is a wonderful day I am so glad",
        "I am in a great mood everything is perfect",
        "so much joy and happiness right now",
        "feeling blissful and elated today",
        "life is beautiful I feel amazing",
        "super excited and thrilled about everything",
        "feeling positive cheerful and delightful",
        "I love today everything is going so well",
        "happy times celebrating good moments",
        "I am going to a party tonight so excited",
        "going out with friends for fun",
        "I am going on a date tonight",
        "going on a date with someone special",
        "I am cooking something delicious today",
        "cooking for my family feels so good",
        "I am going to the garden to enjoy nature",
        "going to the park to enjoy the sunshine",
        "I am having a picnic today",
        "shopping with friends having a great time",
        "playing with my pet so much fun",
        "I am going to a concert tonight",
        "watching my favorite movie feels great",
        "going for ice cream with friends",
        "celebrating birthday party today",
        "I passed my exam feeling so proud",
        "got promoted at work I am thrilled",
        "travelling to a new place so excited",
        "going on a trip with friends",
        "I am planning a surprise for someone",
        "baking a cake for my friend",
        "hanging out with best friends today",
        "I am going on vacation tomorrow",
    ],
    'sad': [
        "I feel very sad and depressed today",
        "feeling heartbroken and miserable",
        "I am upset crying and feeling low",
        "nothing is going right I feel terrible",
        "feeling lonely and gloomy today",
        "I miss someone and feeling very down",
        "so much pain and grief today",
        "I feel like crying everything is wrong",
        "feeling hopeless and broken inside",
        "deep sadness and sorrow in my heart",
        "I am very disappointed and hurt",
        "feeling melancholic and blue today",
        "I am having a bad day and I just want to stay in bed",
        "everything feels wrong and I am not okay",
        "today is a terrible day and I feel so low",
        "my mood is bad and I cannot stop crying",
        "I lost someone close to me",
        "nobody cares about me feeling alone",
        "I failed my exam feeling devastated",
        "breakup happened and I feel broken",
    ],
    'angry': [
        "I am very angry and furious right now",
        "feeling frustrated and irritated",
        "I am so mad and enraged today",
        "everything is making me angry and aggressive",
        "feeling intense rage and hatred",
        "I want to scream I am so angry",
        "burning with anger and frustration",
        "feeling hostile and aggressive today",
        "so irritated and annoyed by everything",
        "I cannot control my anger right now",
        "feeling violent and outraged",
        "extremely furious and upset today",
        "someone cheated me I am so mad",
        "traffic is making me so irritated",
    ],
    'calm': [
        "I feel very calm and relaxed today",
        "feeling peaceful and at ease",
        "I am very serene and comfortable",
        "feeling tranquil and quiet today",
        "I just want to relax and feel peaceful",
        "feeling soothed and gentle today",
        "very still and composed right now",
        "I feel meditative and restful",
        "everything is slow and peaceful today",
        "feeling mellow and easygoing",
        "soft and quiet mood today feeling chill",
        "I am at peace with myself today",
        "reading a book with tea so relaxing",
        "sitting by the window watching rain",
        "doing yoga and meditation today",
        "gardening slowly enjoying nature",
        "I am in my garden enjoying the flowers",
        "walking in the garden feeling peaceful",
        "just sitting in the garden relaxing",
        "taking a warm bath feeling so relaxed",
        "listening to nature sounds feeling calm",
        "I am just chilling at home doing nothing",
        "cooking slowly enjoying the process",
        "making tea and enjoying the silence",
        "painting something beautiful feeling serene",
    ],
    'energetic': [
        "I feel very energetic and pumped up today",
        "feeling so active motivated and ready to go",
        "I am hyped up and full of energy",
        "lets workout I feel powerful and strong",
        "feeling dynamic and full of adrenaline",
        "I want to run dance and jump around",
        "feeling unstoppable and driven right now",
        "super motivated and active today",
        "I have so much energy and enthusiasm",
        "feeling fierce bold and powerful",
        "ready to take on the world feeling strong",
        "high energy mode activated lets go",
        "I am totally energized and excited to move",
        "today I feel electric and alive",
        "going to the gym for an intense workout",
        "playing cricket with friends",
        "playing football and running fast",
        "I am going for a morning run",
        "dancing at a party feeling the beat",
        "riding my bike fast on the highway",
        "going for a hike in the mountains",
        "playing sports and having a blast",
    ],
}

# Convert to training DataFrame
texts, labels = [], []
for mood, sentences in mood_sentences.items():
    for sentence in sentences:
        texts.append(sentence)
        labels.append(mood)

train_df = pd.DataFrame({'text': texts, 'mood': labels})

# Text preprocessing pipeline
stop_words = set(stopwords.words('english'))


def preprocess_text(text):
    """Clean text: lowercase → remove punctuation → tokenize → remove stopwords"""
    if not text or not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'[^a-z\s]', '', text)
    tokens = word_tokenize(text)
    tokens = [w for w in tokens if w not in stop_words and len(w) > 1]
    return ' '.join(tokens)


train_df['clean_text'] = train_df['text'].apply(preprocess_text)

# TF-IDF Vectorization (converts text to numbers)
tfidf = TfidfVectorizer(ngram_range=(1, 2), max_features=500, min_df=1)
X = tfidf.fit_transform(train_df['clean_text'])
y = train_df['mood']

# Train/test split and model training
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = LogisticRegression(max_iter=1000, random_state=42, C=1.0)
model.fit(X_train, y_train)

# Show accuracy
accuracy = accuracy_score(y_test, model.predict(X_test))
print("=" * 50)
print("  [ML] MODEL TRAINED SUCCESSFULLY")
print("=" * 50)
print(f"  Algorithm : Logistic Regression + TF-IDF")
print(f"  Train size: {X_train.shape[0]} sentences")
print(f"  Accuracy  : {accuracy * 100:.1f}%")
print("=" * 50)

# ═══════════════════════════════════════════════════════════
#  STEP 5: Sentiment Lexicon (rule-based mood detection)
# ═══════════════════════════════════════════════════════════
sentiment_lexicon = {
    'happy': {
        'level_3': ['won', 'win', 'champion', 'victory', 'success', 'accomplished', 'birthday', 'celebrate', 'promotion'],
        'level_2': ['great', 'amazing', 'wonderful', 'fantastic', 'awesome', 'very happy', 'so happy', 'joyful', 'cheerful', 'blessed', 'proud', 'celebrating', 'party', 'concert', 'festival', 'vacation', 'holiday', 'trip', 'travel', 'picnic', 'shopping', 'movie', 'fun', 'friends', 'ice cream'],
        'level_1': ['happy', 'good', 'glad', 'delighted', 'pleased', 'enjoy', 'like', 'hanging out', 'going out', 'outing']
    },
    'romantic': {
        'level_3': ['in love', 'deeply in love', 'passionate love', 'soulmate', 'propose', 'wedding', 'anniversary'],
        'level_2': ['love', 'romantic', 'beloved', 'romance', 'affectionate', 'tender', 'adore', 'cherish', 'crush', 'infatuated', 'date', 'dating', 'date night', 'candlelight', 'dinner date', 'girlfriend', 'boyfriend', 'wife', 'husband', 'valentine'],
        'level_1': ['care', 'sweet', 'intimate', 'going on a date', 'special someone', 'partner', 'babe', 'darling']
    },
    'excited': {
        'level_3': ['thrilled', 'ecstatic', 'overjoyed', 'elated', 'exhilarated'],
        'level_2': ['excited', 'enthusiastic', 'eager', 'pumped', 'hyped', 'stoked', 'fired up', 'buzzing', 'cant wait', 'surprise'],
        'level_1': ['interested', 'keen', 'looking forward', 'anticipating']
    },
    'sad': {
        'level_3': ['depressed', 'suicidal', 'hopeless', 'devastated', 'broken hearted', 'miserable'],
        'level_2': ['sad', 'upset', 'heartbroken', 'lonely', 'terrible', 'awful', 'crying', 'hurting', 'gloomy', 'blue', 'hurt', 'mourning', 'grieving', 'breakup', 'miss you', 'lost someone'],
        'level_1': ['bad day', 'not good', 'feeling bad', 'not okay', 'unwanted', 'unhappy']
    },
    'anxious': {
        'level_3': ['panic', 'panicked', 'terrified', 'overwhelmed', 'paranoid'],
        'level_2': ['anxious', 'nervous', 'worried', 'stressed', 'afraid', 'fearful', 'tense', 'uneasy', 'concerned', 'exam tomorrow', 'interview'],
        'level_1': ['unsure', 'apprehensive', 'cautious', 'uncertain']
    },
    'angry': {
        'level_3': ['furious', 'enraged', 'livid', 'rage', 'seething'],
        'level_2': ['angry', 'mad', 'irritated', 'frustrated', 'hostile', 'resentful', 'hate', 'outraged', 'bitter'],
        'level_1': ['annoyed', 'bothered', 'fed up']
    },
    'calm': {
        'level_3': ['meditation', 'meditative', 'perfectly balanced', 'enlightened', 'zen'],
        'level_2': ['calm', 'peaceful', 'serene', 'tranquil', 'relaxed', 'rested', 'centered', 'composed', 'yoga', 'garden', 'gardening', 'nature', 'reading', 'book', 'tea', 'coffee morning', 'painting', 'sketching'],
        'level_1': ['chill', 'content', 'quiet', 'restful', 'comfortable', 'settled', 'cooking', 'baking', 'walk', 'stroll', 'evening walk', 'sitting', 'resting']
    },
    'energetic': {
        'level_3': ['unstoppable', 'powerhouse', 'electric', 'supersonic'],
        'level_2': ['energetic', 'active', 'driven', 'motivated', 'dynamic', 'vigorous', 'vibrant', 'gym', 'workout', 'exercise', 'running', 'dancing', 'cricket', 'football', 'sports', 'hiking', 'cycling', 'bike ride'],
        'level_1': ['ready to go', 'full of energy', 'strong', 'lively', 'jogging', 'swimming']
    }
}

negation_words = {'not', 'no', 'dont', "don't", 'wont', 'cant', 'never', 'neither', 'nobody'}


def detect_negation(text, keyword_pos):
    """Check if a keyword has a negation word before it."""
    words_before = text[:keyword_pos].split()
    if words_before:
        last_word = words_before[-1].lower()
        return last_word in negation_words
    return False


def flip_mood(mood):
    """Flip mood when negated (e.g., 'not happy' → 'sad')."""
    flip_map = {
        'happy': 'sad', 'romantic': 'sad', 'excited': 'calm',
        'sad': 'happy', 'anxious': 'calm', 'calm': 'energetic',
        'energetic': 'calm', 'angry': 'calm'
    }
    return flip_map.get(mood, mood)


def rule_based_mood(user_input):
    """Detect mood using keyword matching with intensity scoring."""
    text = user_input.lower()
    text_clean = re.sub(r'[^a-z0-9\s]', ' ', text)

    scores = {mood: 0 for mood in sentiment_lexicon}
    matched_keywords = {mood: [] for mood in sentiment_lexicon}

    for mood, levels in sentiment_lexicon.items():
        for level, keywords in levels.items():
            for keyword in keywords:
                if keyword in text or keyword in text_clean:
                    pos = text.find(keyword) if keyword in text else text_clean.find(keyword)
                    negated = detect_negation(text, pos) if pos >= 0 else False
                    final_mood = flip_mood(mood) if negated else mood
                    intensity = int(level.split('_')[1])
                    scores[final_mood] += intensity * 2
                    matched_keywords[final_mood].append(keyword)

    best_mood = max(scores, key=scores.get)
    if scores[best_mood] == 0:
        return None, []
    return best_mood, matched_keywords[best_mood]


def predict_mood(user_input):
    """
    Main prediction function:
    1. Try rule-based detection first (keyword matching)
    2. Fall back to ML model (TF-IDF + Logistic Regression)
    Returns: (mood_string, confidence_float, keywords_list)
    """
    if not user_input or not user_input.strip():
        return None

    # Step 1: Try rule-based (faster, more accurate for simple inputs)
    rule_mood, keywords = rule_based_mood(user_input)
    if rule_mood:
        return rule_mood, 100.0, keywords

    # Step 2: Use ML model for complex inputs
    clean = preprocess_text(user_input)
    if not clean:
        return None
    vec = tfidf.transform([clean])
    predicted = model.predict(vec)[0]
    proba = model.predict_proba(vec)[0]
    confidence = max(proba) * 100
    return predicted, confidence, []


# ═══════════════════════════════════════════════════════════
#  STEP 6: Song recommendation functions
# ═══════════════════════════════════════════════════════════

# Map 8 detected moods → 6 dataset moods (romantic is now its own category)
MOOD_MAPPING = {
    'happy': 'happy',
    'romantic': 'romantic',
    'excited': 'energetic',
    'sad': 'sad',
    'anxious': 'calm',
    'angry': 'angry',
    'calm': 'calm',
    'energetic': 'energetic'
}

# Emoji display for each mood
MOOD_DISPLAY = {
    'happy': '😊', 'romantic': '💕', 'excited': '🤩',
    'sad': '😢', 'anxious': '😰', 'angry': '😠',
    'calm': '😌', 'energetic': '⚡'
}


def get_recommendations(mood, top_n=30):
    """
    Get song recommendations for a given mood.
    Returns a list of dicts with song info.
    """
    dataset_mood = MOOD_MAPPING.get(mood, mood)
    mood_songs = df[df['mood'].str.lower() == dataset_mood.lower()]

    if mood_songs.empty:
        # If no songs for this mood, return random songs
        mood_songs = df.sample(min(top_n, len(df)))

    # Shuffle for variety each time
    mood_songs = mood_songs.sample(frac=1).reset_index(drop=True)

    results = []
    for _, row in mood_songs.head(top_n).iterrows():
        song = {
            'title': str(row.get('track_name', 'Unknown')),
            'artist': str(row.get('track_artist', row.get('artist_name', 'Unknown'))),
            'mood': dataset_mood,
        }

        # Add optional fields if they exist in the dataset
        if 'genres' in df.columns:
            genres_val = str(row.get('genres', ''))
            song['genres'] = [g.strip().strip("'\"[]") for g in genres_val.split(',')][:3] if genres_val else []
        if 'track_popularity' in df.columns:
            song['popularity'] = int(row.get('track_popularity', 0))
        if 'duration_ms' in df.columns:
            song['duration'] = int(row.get('duration_ms', 0)) // 1000
        if 'valence' in df.columns:
            song['valence'] = round(float(row.get('valence', 0)), 3)
        if 'energy' in df.columns:
            song['energy'] = round(float(row.get('energy', 0)), 3)
        if 'danceability' in df.columns:
            song['danceability'] = round(float(row.get('danceability', 0)), 3)
        if 'album_name' in df.columns:
            song['album'] = str(row.get('album_name', ''))

        results.append(song)

    return results


# ═══════════════════════════════════════════════════════════
#  STEP 7: Flask API Setup
# ═══════════════════════════════════════════════════════════
app = Flask(__name__)
CORS(app)  # Enable CORS so Node.js can call this API


@app.route('/', methods=['GET'])
def health():
    """Health check endpoint — verify the API is running."""
    return jsonify({
        'status': 'ok',
        'message': '🎵 NeonPulse ML API is running!',
        'model': 'Logistic Regression + TF-IDF',
        'accuracy': f'{accuracy * 100:.1f}%',
        'total_songs': len(df),
        'moods_supported': list(MOOD_DISPLAY.keys()),
    })


@app.route('/recommend', methods=['POST'])
def recommend():
    """
    Main recommendation endpoint.
    
    Accepts JSON body:
      { "mood": "happy" }           → Direct mood (skip NLP)
      { "text": "I feel so happy" } → NLP detects mood from text
      { "mood": "happy", "count": 15 } → With custom count
    
    Returns JSON:
      {
        "detected_mood": "happy",
        "emoji": "😊",
        "confidence": 100.0,
        "keywords": ["happy"],
        "songs": [ { "title": ..., "artist": ... }, ... ],
        "source": "ml-model",
        "total_results": 10
      }
    """
    try:
        data = request.get_json(force=True, silent=True) or {}

        # Get parameters
        mood_input = data.get('mood', '').strip().lower()
        text_input = data.get('text', '').strip()
        top_n = min(int(data.get('count', 30)), 100)  # Max 100 songs

        detected_mood = None
        confidence = 100.0
        keywords = []

        # OPTION 1: Direct mood string provided
        if mood_input and mood_input in MOOD_MAPPING:
            detected_mood = mood_input
            confidence = 100.0
            keywords = [mood_input]

        # OPTION 2: Free-text input — use NLP to detect mood
        elif text_input:
            result = predict_mood(text_input)
            if result is None:
                return jsonify({
                    'error': 'Could not detect mood from text',
                    'suggestion': 'Try describing your feelings more clearly',
                    'supported_moods': list(MOOD_DISPLAY.keys())
                }), 400
            detected_mood, confidence, keywords = result

        # OPTION 3: No valid input
        else:
            return jsonify({
                'error': 'Please provide "mood" or "text" in request body',
                'example_mood': {"mood": "happy", "count": 10},
                'example_text': {"text": "I am feeling very energetic today"},
                'supported_moods': list(MOOD_DISPLAY.keys())
            }), 400

        # Get song recommendations
        songs = get_recommendations(detected_mood, top_n)
        emoji = MOOD_DISPLAY.get(detected_mood, '🎵')

        return jsonify({
            'detected_mood': detected_mood,
            'dataset_mood': MOOD_MAPPING.get(detected_mood, detected_mood),
            'emoji': emoji,
            'confidence': round(confidence, 1),
            'keywords': list(set(keywords)),
            'songs': songs,
            'source': 'ml-model',
            'total_results': len(songs),
        })

    except Exception as e:
        print(f"[ERROR] Error in /recommend: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/moods', methods=['GET'])
def get_moods():
    """Return list of supported moods with their emojis."""
    return jsonify({
        'moods': [
            {'id': mood, 'emoji': emoji, 'dataset_mood': MOOD_MAPPING[mood]}
            for mood, emoji in MOOD_DISPLAY.items()
        ]
    })


@app.route('/stats', methods=['GET'])
def get_stats():
    """Return dataset statistics."""
    mood_counts = df['mood'].value_counts().to_dict()
    return jsonify({
        'total_songs': len(df),
        'mood_distribution': mood_counts,
        'model_accuracy': f'{accuracy * 100:.1f}%',
        'columns': list(df.columns),
    })


# ═══════════════════════════════════════════════════════════
#  STEP 8: Run the server
# ═══════════════════════════════════════════════════════════
if __name__ == '__main__':
    PORT = int(os.environ.get('ML_PORT', 5001))
    print(f"\n{'=' * 50}")
    print(f"  NeonPulse ML API running on http://localhost:{PORT}")
    print(f"  {len(df)} songs loaded from Spotify dataset")
    print(f"  Model accuracy: {accuracy * 100:.1f}%")
    print(f"  Endpoints:")
    print(f"     GET  /          -> Health check")
    print(f"     POST /recommend -> Get song recommendations")
    print(f"     GET  /moods     -> List supported moods")
    print(f"     GET  /stats     -> Dataset statistics")
    print(f"{'=' * 50}\n")

    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=True,
        use_reloader=False  # Prevents model from training twice
    )
