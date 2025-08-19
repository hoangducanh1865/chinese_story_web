#!/bin/bash

# Install dependencies for web
cd web
npm install

# Build the Next.js application
npm run build

# Go back to root
cd ..

echo "Build completed successfully!"
