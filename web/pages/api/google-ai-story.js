import { GoogleGenerativeAI } from '@google/generative-ai';

// Function to parse vocabulary analysis
function parseVocabularyAnalysis(vocabText) {
    const vocabulary = [];
    
    try {
        // Parse vocabulary items in format: 中文 (pinyin) - Vietnamese meaning
        const lines = vocabText.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.length < 3) continue;
            
            // Try different patterns to extract vocabulary
            let match;
            
            // Pattern: 中文 (pinyin) - Vietnamese
            match = trimmedLine.match(/^[\d\.\-\*\s]*([^\(\)]+?)\s*\(([^)]+)\)\s*[-–—]\s*(.+)$/);
            
            if (!match) {
                // Pattern: 中文(pinyin) - Vietnamese
                match = trimmedLine.match(/^[\d\.\-\*\s]*([^\(\)]+?)\(([^)]+)\)\s*[-–—]\s*(.+)$/);
            }
            
            if (!match) {
                // Pattern: 中文 - Vietnamese (pinyin)
                match = trimmedLine.match(/^[\d\.\-\*\s]*([^\-–—]+?)\s*[-–—]\s*([^(]+?)\s*\(([^)]+)\)$/);
                if (match) {
                    // Reorder to maintain consistency
                    match = [match[0], match[1], match[3], match[2]];
                }
            }
            
            if (match) {
                const chinese = match[1].trim();
                const pinyin = match[2].trim();
                const vietnamese = match[3].trim();
                
                if (chinese && pinyin && vietnamese) {
                    vocabulary.push({
                        chinese,
                        pinyin,
                        vietnamese
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error parsing vocabulary analysis:', error);
    }
    
    return vocabulary;
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || 'AIzaSyA-RoIFHiugICkurNANegXrXfI48ZhzRsY');

export default async function handler(req, res) {
    try {
        const { temperature = 0.8, prompt = "" } = req.query;
        
        // Log request for debugging
        console.log(`Story generation request - Temperature: ${temperature}, Time: ${new Date().toISOString()}`);
        
        // Get the model - using supported model
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Create prompt for Chinese story generation with Vietnamese translation
        const randomTopics = [
            // healing / motivation
            "心灵治愈", "自我成长", "积极生活", "努力学习", "克服困难", "友情和支持", "梦想与希望", 
            // technology / CS / AI
            "人工智能", "计算机科学", "未来科技", "程序设计", "机器人", "互联网生活", "大数据", "虚拟现实", "手机应用",
            // keep some simple HSK daily-life topics (for balance)
            "学校生活", "家庭聚会", "健康生活", "读书经历", "旅行故事"
        ];
        
        const randomCharacters = [
            "小明和小红", "张老师和学生们", "爷爷奶奶", "小李和朋友", "王医生",
            "刘妈妈和孩子", "陈先生", "林小姐", "老王和邻居", "小张同学"
        ];
        
        const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
        const randomCharacter = randomCharacters[Math.floor(Math.random() * randomCharacters.length)];
        const randomNumber = Math.floor(Math.random() * 1000);
        
        const storyPrompt = prompt || `
请创作一个关于"${randomTopic}"的全新中文故事（30-50个句子，大约500-800字），主角是"${randomCharacter}"，并提供完整的越南语翻译和词汇分析。

创作要求：
- 这是第${randomNumber}个独特的故事，必须与之前的故事完全不同
- 严格使用HSK 1-3级别的汉字和词汇
- 避免复杂的成语和专业术语
- 使用常见的日常用词

故事内容要求：
- 讲述一个完整的故事，有开头、发展、高潮和结尾
- 主题必须与"心灵治愈、自我成长、积极生活、人工智能、计算机科学、未来科技"等相关
- 情节可以结合日常生活场景，也可以包含学习、研究、科技探索或心理成长的经历
- 情节要有趣且富有教育意义
- 适合中文学习者阅读和理解
- 语言自然流畅，句子结构不要太复杂

故事长度：
- 30-50个句子
- 每个句子长度适中（8-15个字）
- 总字数控制在500-800字之间

词汇分析要求：
- 对每个句子分析3-5个重要的学习词汇
- 选择对中文学习者有用的词汇（动词、名词、形容词优先）
- 提供中文拼音和越南语意思
- 按句子顺序进行分析

创新要求：
- 必须是原创内容，不重复之前的故事
- 情节要新颖有趣
- 人物行为要符合生活常理
- 加入一些小细节让故事更生动

请严格按以下格式输出：
中文故事：[在这里写完整的中文故事]
越南语翻译：[在这里写对应的完整越南语翻译]
词汇分析：
句子1：[第一个句子]
重要词汇：
- 词汇1：拼音 - 越南语意思
- 词汇2：拼音 - 越南语意思
- 词汇3：拼音 - 越南语意思
句子2：[第二个句子]
重要词汇：
- 词汇1：拼音 - 越南语意思
- 词汇2：拼音 - 越南语意思
[继续其他句子...]

不要包含其他解释、说明或格式标记。
        `;
        
        // Configure generation parameters for longer content with enhanced randomness
        const generationConfig = {
            temperature: Math.max(0.1, Math.min(1.0, parseFloat(temperature))),
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2000, // Increased for longer stories
            // Add some randomness to prevent caching
            candidateCount: 1,
        };
        
        // Generate content with unique session identifier
        const sessionId = Date.now() + Math.random();
        const result = await model.generateContent({
            contents: [{ 
                role: "user", 
                parts: [{ 
                    text: storyPrompt + `\n\n[会话ID: ${sessionId}]` 
                }] 
            }],
            generationConfig,
        });
        
        const response = await result.response;
        const generatedText = response.text();
        
        // Clean up the response
        const cleanedText = generatedText
            .replace(/```.*?```/gs, '') // Remove code blocks
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
            .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
            .replace(/#+\s*/g, '') // Remove headers
            .replace(/\[会话ID:.*?\]/g, '') // Remove session ID
            .trim();
        
        // Parse Chinese story, Vietnamese translation, and vocabulary analysis
        let chineseStory = '';
        let vietnameseTranslation = '';
        let vocabularyAnalysis = [];
        
        try {
            // Try to extract Chinese story, Vietnamese translation, and vocabulary
            const chineseMatch = cleanedText.match(/中文故事：(.*?)(?=越南语翻译：|$)/s);
            const vietnameseMatch = cleanedText.match(/越南语翻译：(.*?)(?=词汇分析：|$)/s);
            const vocabularyMatch = cleanedText.match(/词汇分析：(.*?)$/s);
            
            if (chineseMatch && vietnameseMatch) {
                chineseStory = chineseMatch[1].trim();
                vietnameseTranslation = vietnameseMatch[1].trim();
                
                // Parse vocabulary analysis if available
                if (vocabularyMatch) {
                    const vocabText = vocabularyMatch[1].trim();
                    vocabularyAnalysis = parseVocabularyAnalysis(vocabText);
                }
            } else {
                // Alternative parsing approach
                const lines = cleanedText.split('\n').filter(line => line.trim());
                let foundChinese = false;
                let foundVietnamese = false;
                let foundVocabulary = false;
                let currentSection = '';
                
                for (const line of lines) {
                    if (line.includes('中文故事：') || line.includes('故事：')) {
                        currentSection = 'chinese';
                        chineseStory = line.replace(/^(中文故事：|故事：|中文：)/, '').trim();
                        foundChinese = true;
                    } else if (line.includes('越南语翻译：') || line.includes('翻译：')) {
                        currentSection = 'vietnamese';
                        vietnameseTranslation = line.replace(/^(越南语翻译：|翻译：|越南语：)/, '').trim();
                        foundVietnamese = true;
                    } else if (line.includes('词汇分析：')) {
                        currentSection = 'vocabulary';
                        foundVocabulary = true;
                    } else if (currentSection === 'chinese' && !foundVietnamese) {
                        chineseStory += ' ' + line.trim();
                    } else if (currentSection === 'vietnamese' && !foundVocabulary) {
                        vietnameseTranslation += ' ' + line.trim();
                    }
                }
                
                // If still no luck, use the whole text as Chinese story
                if (!chineseStory && cleanedText.length > 0) {
                    chineseStory = cleanedText.split('越南语翻译：')[0].trim();
                }
            }
        } catch (parseError) {
            console.error('Error parsing generated content:', parseError);
            chineseStory = cleanedText;
        }
        
        // If Vietnamese translation is empty or too short, generate it separately
        if (!vietnameseTranslation || vietnameseTranslation.length < 10) {
            try {
                const translationPrompt = `Dịch văn bản tiếng Trung sau sang tiếng Việt:

${chineseStory}

Yêu cầu:
- Dịch chính xác và tự nhiên
- Giữ nguyên ý nghĩa
- Chỉ trả về bản dịch, không giải thích`;

                const translationResult = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: translationPrompt }] }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
                });
                
                const translationResponse = await translationResult.response;
                vietnameseTranslation = translationResponse.text()
                    .replace(/```.*?```/gs, '')
                    .replace(/\*\*(.*?)\*\*/g, '$1')
                    .replace(/\*(.*?)\*/g, '$1')
                    .replace(/#+\s*/g, '')
                    .replace(/^(Bản dịch tiếng Việt:|Dịch:|Translation:)/i, '')
                    .trim();
            } catch (translationError) {
                console.error('Translation error:', translationError);
                vietnameseTranslation = 'Không thể tạo bản dịch tiếng Việt.';
            }
        }
        
        // Validate story length and content (adjusted for longer stories)
        if (!chineseStory || chineseStory.length < 200) {
            throw new Error('Generated story is too short or empty');
        }
        
        // Log successful generation
        console.log(`Story generated successfully - Length: ${chineseStory.length} chars, Topic: ${randomTopic}, Character: ${randomCharacter}`);
        
        res.status(200).json({
            story: chineseStory,
            translation: vietnameseTranslation,
            vocabulary: vocabularyAnalysis,
            method: 'google_ai',
            temperature: parseFloat(temperature),
            model: 'Gemini Pro',
            model_available: true,
            metadata: {
                topic: randomTopic,
                character: randomCharacter,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Google AI Studio error:', error);
        
        // Longer fallback stories with Vietnamese translations (30+ sentences each)
        const fallbackStories = [
            {
                chinese: "BUG",
                vietnamese: "BUG"
            }
        ];
        
        const randomStoryData = fallbackStories[Math.floor(Math.random() * fallbackStories.length)];
        
        // Log fallback usage
        console.log(`Using fallback story due to API error: ${error.message}`);
        
        res.status(200).json({
            story: randomStoryData.chinese,
            translation: randomStoryData.vietnamese,
            vocabulary: randomStoryData.vocabulary || [],
            method: 'fallback',
            temperature: parseFloat(req.query.temperature || 0.8),
            model: 'Fallback',
            model_available: false,
            error: 'Google AI API failed: ' + error.message,
            metadata: {
                fallback_index: fallbackStories.indexOf(randomStoryData),
                timestamp: new Date().toISOString()
            }
        });
    }
}
