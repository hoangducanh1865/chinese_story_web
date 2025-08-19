# Chinese Story Web App

A web application that generates Chinese stories using Generative Adversarial Networks (GAN) with a Next.js frontend.

## Project Structure

```
chinese_story_web/
├── web/                         # Next.js frontend
│   ├── pages/
│   │   ├── index.js            # Main UI with method selection
│   │   └── api/
│   │       ├── story.js        # GAN model API
│   │       ├── google-ai-story.js # Google AI Studio API
│   │       ├── translate.js    # Vietnamese translation API
│   │       └── model-status.js # Model status API
│   ├── package.json
│   └── next.config.js
└── model/                       # Python GAN model
    ├── chinese_story_gan.py     # GAN implementation
    ├── train_model.py           # Training script
    ├── story_generator.py       # CLI interface for Next.js
    ├── requirements.txt         # Python dependencies
    ├── setup.sh                # Setup script
    └── README.md               # Model documentation
```

## Features

- 🤖 **Dual AI Models**: Choose between custom GAN model or Google AI Studio (Gemini Pro)
- 🎛️ **Temperature Control**: Adjust creativity/randomness (0.1-2.0)
- 🌏 **Vietnamese Translation**: Auto-translate Chinese stories to Vietnamese using AI
- 🔊 **Advanced Text-to-Speech**: 
  - **Normal Mode**: Read entire story in Chinese
  - **Sentence Learning Mode**: Read each sentence as Vietnamese → Chinese → Chinese (for memory)
- ⚡ **Speech Rate Presets**: Quick buttons for Slow, Normal, Fast, and Very Fast reading speeds
- 📚 **Language Learning Features**: Sentence-by-sentence learning with translation support
- 💾 **Persistent Settings**: Automatically saves preferences (temperature, speech rate, generation method, reading mode)
- 📊 **Model Status**: Real-time model availability checking
- 🔄 **Fallback System**: Graceful degradation when models are unavailable
- 🌐 **Modern UI**: Clean, responsive React interface with bilingual support

## Quick Start

### 1. Setup Next.js Frontend

```bash
cd web
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

### 2. Configure Google AI Studio (Optional)

The app includes Google AI Studio integration using Gemini Pro model. The API key is already configured, but you can update it in `/web/pages/api/google-ai-story.js` if needed.

### 3. Setup Python GAN Model (Optional)

```bash
cd model
chmod +x setup.sh
./setup.sh
```

### 4. Train GAN Model (Optional)

```bash
cd model
source venv/bin/activate
python train_model.py
```

## How It Works

### **Method 1: Google AI Studio (Gemini Pro)**
```
User Selection → API Route → Google AI Studio → Gemini Pro → Generated Story
```

### **Method 2: Custom GAN Model**
```
User Selection → API Route → subprocess → Python Script → GAN Model → Generated Story
```

1. **Frontend (Next.js)**: User selects generation method and clicks "Generate Story"
2. **API Route**: Calls appropriate endpoint based on user selection
3. **AI Model**: Either Google AI Studio API or local Python GAN model
4. **Response**: JSON story data returned to frontend

### Model Integration

The Next.js app calls the Python model using Node.js `child_process.spawn()`:

```javascript
// In pages/api/story.js
const pythonProcess = spawn('python3', [scriptPath, '--action', 'generate', '--temperature', temperature]);
```

### Fallback System

If the GAN model is not available, the system automatically uses pre-written Chinese stories to ensure the app always works.

## Development

### Frontend Development
```bash
cd web
npm run dev
```

### Model Development
```bash
cd model
source venv/bin/activate
python story_generator.py --temperature 0.8
```

## API Endpoints

- `GET /api/story?temperature=0.8&useGAN=true` - Generate story using GAN model
- `GET /api/google-ai-story?temperature=0.8` - Generate story using Google AI Studio
- `POST /api/translate` - Translate Chinese text to Vietnamese
- `GET /api/model-status` - Check GAN model availability

## Technologies

- **Frontend**: Next.js, React, JavaScript
- **AI Models**: 
  - Custom: Python, PyTorch, LSTM/GAN
  - Cloud: Google AI Studio (Gemini Pro)
- **Integration**: Node.js subprocess, REST API, JSON communication
- **Text Processing**: jieba (Chinese tokenization)
- **Speech**: Web Speech API with rate control, dual language support (Chinese + Vietnamese)
- **Translation**: Google AI Studio for Chinese-Vietnamese translation
- **Storage**: localStorage for user preferences

## Model Architecture

- **Generator**: LSTM-based sequence model with embedding layer
- **Discriminator**: LSTM-based binary classifier  
- **Training**: Adversarial training on Chinese story dataset
- **Inference**: Temperature-controlled sampling for creativity

## Language Learning Features

### **🔊 Sentence Learning Mode**
Perfect for Chinese language learners:

1. **Generate Story**: Create a Chinese story using AI
2. **Translate**: Get Vietnamese translation for context
3. **Listen & Learn**: Each sentence follows this pattern:
   - 🇻🇳 **Vietnamese** (meaning/context)
   - 🇨🇳 **Chinese** (first time - learn pronunciation)
   - 🇨🇳 **Chinese** (second time - memorize)

### **📚 Learning Benefits**
- **Context Understanding**: Vietnamese translation provides meaning
- **Pronunciation Practice**: Hear correct Chinese pronunciation twice
- **Memory Reinforcement**: Repetition helps memorization
- **Speed Control**: Adjust reading speed for your level
- **Sentence-by-Sentence**: Learn at your own pace

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test both frontend and model
5. Submit a pull request
