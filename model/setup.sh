#!/bin/bash

echo "Setting up Chinese Story GAN Model..."

# Navigate to model directory
cd "$(dirname "$0")"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python3 is required but not installed. Please install Python3 first."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Make story_generator.py executable
chmod +x story_generator.py

echo "Setup complete!"
echo ""
echo "To train the model:"
echo "  cd model"
echo "  source venv/bin/activate"
echo "  python train_model.py"
echo ""
echo "To test the story generator:"
echo "  cd model"
echo "  source venv/bin/activate"
echo "  python story_generator.py --temperature 0.8"
echo ""
echo "The Next.js app will automatically call the Python script when generating stories."
echo "Start the Next.js development server with:"
echo "  cd web"
echo "  npm run dev"
