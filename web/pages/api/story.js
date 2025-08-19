import { spawn } from 'child_process';
import path from 'path';

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Fallback function for when GAN model is not available
function generateFallbackStory() {
    const stories = [
        "小明今天去学校。他很喜欢学习中文。老师教他很多新的汉字。今天是美好的一天。",
        "昨天下雨了。小红在家里看书。她喜欢读有趣的故事。妈妈给她做了热茶。",
        "爸爸妈妈去超市买菜。他们买了很多新鲜的水果和蔬菜。晚上全家一起吃饭。",
        "我的朋友来我家玩。我们一起看电影，吃好吃的零食。度过了愉快的时光。",
        "春天来了。花儿开了，树叶绿了。公园里有很多人在散步。空气很清新。",
        "小猫很可爱。它喜欢玩毛线球。每天晚上它都睡在我的床上。我很喜欢它。",
        "今天是周末。我和家人去公园玩。我们看到了很多美丽的花。大家都很开心。",
        "老师给我们讲了一个有趣的故事。故事里有勇敢的王子和美丽的公主。我们听得很认真。",
        "小张今天学做饭。他先洗菜，然后切菜。妈妈在旁边指导他。第一次做菜很成功。",
        "图书馆里很安静。小李在认真看书。他正在准备明天的考试。希望能取得好成绩。",
        "公园里的花开得很美。小红和朋友们一起拍照。她们玩得很开心。阳光很温暖。",
        "爷爷每天早上都去散步。他走过小桥，经过花园。邻居们都和他打招呼。这是快乐的早晨。",
        "小王第一次坐地铁。他看地图，找正确的路线。虽然有点紧张，但最终到达了目的地。",
        "妈妈在厨房做晚饭。香味飘到客厅。全家人都等着吃饭。今晚的菜一定很好吃。",
        "小刘喜欢画画。他画了一只小鸟和一棵大树。老师说画得很好。他很高兴。",
        "下雪了！孩子们跑出来玩雪。他们堆雪人，打雪仗。冬天真是太有趣了。",
        "小陈在学骑自行车。开始有点害怕，但爸爸在旁边帮助他。经过练习，他终于学会了。",
        "市场上的水果很新鲜。奶奶买了苹果、香蕉和橙子。回家后大家一起分享美味的水果。"
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