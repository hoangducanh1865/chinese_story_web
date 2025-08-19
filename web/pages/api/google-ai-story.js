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
            "学校生活", "家庭聚会", "购物经历", "公园游玩", "朋友聚会", 
            "做饭经历", "旅行故事", "宠物生活", "运动活动", "读书经历",
            "工作日常", "节日庆祝", "天气变化", "交通出行", "健康生活"
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
- 包含日常生活场景（如：上学、购物、吃饭、家庭活动、朋友交往等）
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
                chinese: "小明是一个十二岁的学生。他每天早上七点起床。妈妈给他准备好吃的早餐。小明很喜欢吃面包和喝牛奶。吃完早餐后，他背着书包去学校。学校离家不远，走路十分钟就到了。路上他会遇到好朋友小红。小红也是他的同班同学。他们一起走路去学校，一路上聊天说笑。到了学校，他们先去教室放书包。第一节课是语文课。老师教他们读课文和写汉字。小明很认真地听老师讲课。他喜欢学习新的汉字。下课后，他和同学们在操场上玩。中午时间到了，大家一起去食堂吃午餐。食堂的饭菜很好吃。小明吃了米饭、青菜和鸡肉。吃完午餐，他们有一个小时的休息时间。小明选择在图书馆看书。下午有数学课和英语课。小明的数学很好，但英语有点难。放学后，他和小红一起回家。晚上，小明先做作业，然后帮妈妈做家务。九点的时候，他洗澡准备睡觉。睡觉前，他会看一会儿课外书。小明觉得今天很充实，明天又是新的一天。",
                vietnamese: "BUG là một học sinh mười hai tuổi. Mỗi ngày cậu ấy dậy lúc bảy giờ sáng. Mẹ chuẩn bị bữa sáng ngon cho cậu ấy. Tiểu Minh rất thích ăn bánh mì và uống sữa. Sau khi ăn sáng xong, cậu ấy đeo ba lô đi học. Trường học cách nhà không xa, đi bộ mười phút là đến. Trên đường cậu ấy gặp bạn thân Tiểu Hồng. Tiểu Hồng cũng là bạn cùng lớp của cậu ấy. Họ cùng nhau đi bộ đến trường, vừa đi vừa trò chuyện cười đùa. Đến trường, họ vào lớp để cất ba lô trước. Tiết đầu tiên là môn Ngữ văn. Cô giáo dạy họ đọc bài văn và viết chữ Hán. Tiểu Minh rất chăm chú nghe cô giảng bài. Cậu ấy thích học chữ Hán mới. Sau giờ ra chơi, cậu ấy cùng các bạn chơi ở sân trường. Đến giờ ăn trưa, mọi người cùng nhau đến căng tin ăn cơm. Cơm ở căng tin rất ngon. Tiểu Minh ăn cơm, rau xanh và thịt gà. Ăn trưa xong, họ có một giờ nghỉ ngơi. Tiểu Minh chọn đến thư viện đọc sách. Buổi chiều có môn Toán và Tiếng Anh. Toán của Tiểu Minh rất giỏi, nhưng Tiếng Anh hơi khó. Tan học, cậu ấy cùng Tiểu Hồng về nhà. Buổi tối, Tiểu Minh làm bài tập trước, sau đó giúp mẹ làm việc nhà. Lúc chín giờ, cậu ấy tắm và chuẩn bị đi ngủ. Trước khi ngủ, cậu ấy đọc sách ngoại khóa một lúc. Tiểu Minh cảm thấy hôm nay rất đầy đủ, ngày mai lại là một ngày mới."
            },
            {
                chinese: "周末到了，小红的家人决定去公园玩。早上八点，爸爸开车带着全家出发。车上有爸爸、妈妈、小红和弟弟小明。他们开了半个小时才到公园。公园很大，里面有很多美丽的花和绿色的树。小红看到了红色的玫瑰花、黄色的菊花和白色的茉莉花。她觉得非常漂亮。弟弟小明跑去看湖里的鱼。湖水很清澈，能看见小鱼在水里游来游去。妈妈在湖边的椅子上坐下休息。爸爸拿出相机给大家拍照。他们拍了很多美丽的照片。十点的时候，他们去公园的游乐场玩。小红玩了秋千和滑梯。小明喜欢玩跷跷板。爸爸妈妈在旁边看着孩子们玩，心里很高兴。中午时间到了，他们在公园的餐厅吃午餐。餐厅的食物很好吃。小红点了面条，小明要了汉堡包。饭后，他们去公园的动物园看动物。动物园里有大象、狮子、猴子和熊猫。小红最喜欢可爱的熊猫。下午三点，天气有点热，他们在树荫下休息。爸爸买了冰淇淋给孩子们吃。五点的时候，他们准备回家。小红觉得今天玩得很开心。在回家的路上，全家人都很满足。这是一个美好的周末。",
                vietnamese: "BUG đến rồi, gia đình Tiểu Hồng quyết định đi công viên chơi. Sáng tám giờ, bố lái xe đưa cả gia đình đi. Trên xe có bố, mẹ, Tiểu Hồng và em trai Tiểu Minh. Họ mất nửa tiếng mới đến công viên. Công viên rất rộng, trong đó có nhiều hoa đẹp và cây xanh. Tiểu Hồng nhìn thấy hoa hồng đỏ, hoa cúc vàng và hoa nhài trắng. Cô ấy cảm thấy rất đẹp. Em trai Tiểu Minh chạy đi xem cá trong hồ. Nước hồ rất trong, có thể nhìn thấy cá nhỏ bơi lội trong nước. Mẹ ngồi nghỉ trên ghế bên hồ. Bố lấy máy ảnh ra chụp hình cho mọi người. Họ chụp được nhiều bức ảnh đẹp. Mười giờ, họ đến khu vui chơi của công viên chơi. Tiểu Hồng chơi xích đu và cầu trượt. Tiểu Minh thích chơi bập bênh. Bố mẹ đứng bên cạnh xem các con chơi, trong lòng rất vui. Đến giờ ăn trưa, họ ăn ở nhà hàng trong công viên. Thức ăn ở nhà hàng rất ngon. Tiểu Hồng gọi mì, Tiểu Minh muốn bánh hamburger. Sau khi ăn, họ đến sở thú trong công viên xem động vật. Trong sở thú có voi, sư tử, khỉ và gấu trúc. Tiểu Hồng thích nhất gấu trúc đáng yêu. Ba giờ chiều, thời tiết hơi nóng, họ nghỉ dưới bóng cây. Bố mua kem cho các con ăn. Năm giờ, họ chuẩn bị về nhà. Tiểu Hồng cảm thấy hôm nay chơi rất vui. Trên đường về nhà, cả gia đình đều rất hài lòng. Đây là một cuối tuần tuyệt vời."
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
