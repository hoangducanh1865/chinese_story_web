import { spawn } from 'child_process';
import path from 'path';

export default async function handler(req, res) {
    try {
        // Path to the model directory
        const modelDir = path.join(process.cwd(), '..', 'model');
        const scriptPath = path.join(modelDir, 'story_generator.py');
        
        // Check model status
        const pythonProcess = spawn('python3', [scriptPath, '--action', 'status'], {
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
                    res.status(200).json(result);
                } else {
                    res.status(200).json({
                        model_available: false,
                        error: 'Failed to check model status',
                        stderr: stderr
                    });
                }
            } catch (parseError) {
                res.status(200).json({
                    model_available: false,
                    error: 'Failed to parse status response'
                });
            }
        });
        
        pythonProcess.on('error', (error) => {
            res.status(200).json({
                model_available: false,
                error: 'Failed to spawn Python process: ' + error.message
            });
        });
        
        // Set timeout
        setTimeout(() => {
            pythonProcess.kill();
            res.status(200).json({
                model_available: false,
                error: 'Status check timeout'
            });
        }, 5000); // 5 second timeout
        
    } catch (error) {
        res.status(200).json({
            model_available: false,
            error: error.message
        });
    }
}
