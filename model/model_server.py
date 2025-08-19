from flask import Flask, jsonify, request
import sys
import os

# Add the model directory to Python path
sys.path.append(os.path.dirname(__file__))

from train_model import generate_story_api, load_trained_model

app = Flask(__name__)

# Load model once when server starts
print("Loading Chinese Story GAN model...")
model = None
try:
    model = load_trained_model()
    if model:
        print("Model loaded successfully!")
    else:
        print("Model not found. Please train the model first.")
except Exception as e:
    print(f"Error loading model: {e}")

@app.route('/generate_story', methods=['GET'])
def generate_story():
    """Generate a Chinese story using GAN"""
    try:
        # Get parameters from request
        temperature = float(request.args.get('temperature', 0.8))
        temperature = max(0.1, min(2.0, temperature))  # Clamp between 0.1 and 2.0
        
        if model is None:
            return jsonify({
                'error': 'Model not available. Please train the model first.',
                'story': '小明今天去学校。他很喜欢学习中文。老师教他很多新的汉字。今天是美好的一天。'  # Fallback story
            }), 500
        
        # Generate story
        story = model.generate_story(temperature=temperature)
        
        # Clean up the story (remove special tokens)
        story = story.replace('<s>', '').replace('</s>', '').replace('<UNK>', '').replace('<PAD>', '').strip()
        
        # If story is too short or empty, provide a fallback
        if len(story) < 10:
            story = "今天天气很好。小明和朋友们一起去公园玩。他们看到了很多美丽的花朵和绿色的树木。大家都很开心。"
        
        return jsonify({
            'story': story,
            'temperature': temperature,
            'model': 'Chinese Story GAN'
        })
        
    except Exception as e:
        print(f"Error generating story: {e}")
        return jsonify({
            'error': str(e),
            'story': '从前有一个小村庄，住着一个善良的女孩。她每天都帮助村里的人们。有一天，她发现了一朵神奇的花。'  # Fallback story
        }), 500

@app.route('/model_status', methods=['GET'])
def model_status():
    """Check model status"""
    return jsonify({
        'model_loaded': model is not None,
        'model_type': 'Chinese Story GAN' if model else None
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
