import { spawn } from 'child_process';
import path from 'path';

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Fallback function for when GAN model is not available
function generateFallbackStory() {
    const stories = [
        "BUG",
    ];
    
    // Add randomness to ensure different stories
    const randomIndex = Math.floor(Math.random() * stories.length);
    const selectedStory = stories[randomIndex];
    
    // Add a timestamp or random element to make it unique
    const timeElement = new Date().getMinutes();
    if (timeElement % 3 === 0) {
        // Occasionally modify the story slightly
        return selectedStory + "这是一个特别的时刻。";
    }
    
    return selectedStory;
}

// Function to call Python GAN model via subprocess
async function generateStoryFromGAN(temperature = 0.8) {
    return new Promise((resolve) => {
        try {
            // Path to the model directory (relative to project root)
            const modelDir = path.join(process.cwd(), '..', 'model');
            const scriptPath = path.join(modelDir, 'story_generator.py');
            
            // Try different Python commands
            const pythonCommands = ['python3', 'python'];
            let pythonCmd = 'python3';
            
            // Spawn Python process
            const args = [scriptPath, '--action', 'generate', '--temperature', temperature.toString()];
            const pythonProcess = spawn(pythonCmd, args, {
                cwd: modelDir,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            let stdout = '';
            let stderr = '';
            
            pythonProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            pythonProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            pythonProcess.on('close', (code) => {
                try {
                    if (code === 0 && stdout.trim()) {
                        const result = JSON.parse(stdout.trim());
                        resolve(result);
                    } else {
                        console.warn('Python process failed:', stderr);
                        resolve({
                            story: generateFallbackStory(),
                            method: 'fallback',
                            error: 'Python process failed'
                        });
                    }
                } catch (parseError) {
                    console.warn('Failed to parse Python output:', parseError);
                    resolve({
                        story: generateFallbackStory(),
                        method: 'fallback',
                        error: 'Failed to parse Python output'
                    });
                }
            });
            
            pythonProcess.on('error', (error) => {
                console.warn('Failed to spawn Python process:', error.message);
                resolve({
                    story: generateFallbackStory(),
                    method: 'fallback',
                    error: 'Failed to spawn Python process'
                });
            });
            
            // Set timeout
            setTimeout(() => {
                pythonProcess.kill();
                resolve({
                    story: generateFallbackStory(),
                    method: 'fallback',
                    error: 'Python process timeout'
                });
            }, 10000); // 10 second timeout
            
        } catch (error) {
            console.warn('Error in generateStoryFromGAN:', error);
            resolve({
                story: generateFallbackStory(),
                method: 'fallback',
                error: error.message
            });
        }
    });
}

export default async function handler(req, res) {
    try {
        const { temperature = 0.8, useGAN = true } = req.query;
        
        let result;
        
        if (useGAN === 'true' || useGAN === true) {
            // Try to use GAN model first
            result = await generateStoryFromGAN(parseFloat(temperature));
        } else {
            // Use fallback method
            result = {
                story: generateFallbackStory(),
                method: 'fallback',
                temperature: parseFloat(temperature)
            };
        }
        
        // Ensure we have a valid story
        if (!result.story || result.story.trim().length === 0) {
            result.story = generateFallbackStory();
            result.method = 'fallback';
        }
        
        res.status(200).json({ 
            story: result.story,
            method: result.method || 'unknown',
            temperature: parseFloat(temperature),
            model_available: result.model_available || false,
            error: result.error || null
        });
        
    } catch (error) {
        console.error('Error in story generation:', error);
        
        // Always provide a fallback story
        const fallbackStory = generateFallbackStory();
        
        res.status(200).json({ 
            story: fallbackStory,
            method: 'fallback',
            temperature: parseFloat(req.query.temperature || 0.8),
            error: 'Primary generation method failed: ' + error.message
        });
    }
}