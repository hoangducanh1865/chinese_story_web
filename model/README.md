# Chinese Story Generator with GAN

This model uses Generative Adversarial Networks (GAN) to generate meaningful Chinese stories. It's integrated with a Next.js frontend that calls the Python model via subprocess.

## Setup

1. Run the setup script:
```bash
cd model
chmod +x setup.sh
./setup.sh
```

Or manually:
```bash
cd model
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. Train the model (optional, fallback stories available):
```bash
source venv/bin/activate
python train_model.py
```

3. Test the CLI interface:
```bash
source venv/bin/activate
python story_generator.py --temperature 0.8
python story_generator.py --action status
```

## Integration with Next.js

The model is called directly from Next.js API routes via subprocess:

- **story.js**: Main API route that calls `story_generator.py`
- **model-status.js**: API route to check model availability

### CLI Interface

The `story_generator.py` script provides a command-line interface:

```bash
# Generate a story
python story_generator.py --action generate --temperature 0.8

# Check model status  
python story_generator.py --action status
```

Returns JSON output that Next.js can parse.

## Model Architecture

### Generator
- LSTM-based sequence generator
- Embedding layer for Chinese characters/words
- Temperature-controlled sampling for creativity

### Discriminator  
- LSTM-based classifier
- Distinguishes between real and generated stories
- Provides feedback to improve generator

## Training Data

The model is trained on Chinese stories with:
- Simple vocabulary (HSK 1-3 level)
- Short sentences with clear structure
- Common daily life scenarios

## Usage in Next.js

The model server runs on port 5000 and can be called from the Next.js API routes.
