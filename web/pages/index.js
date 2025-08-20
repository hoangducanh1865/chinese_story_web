import { useState, useEffect } from "react";

export default function Home() {
    const [story, setStory] = useState("");
    const [storyInfo, setStoryInfo] = useState(null);
    const [modelStatus, setModelStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [temperature, setTemperature] = useState(0.8);
    const [generationMethod, setGenerationMethod] = useState('gan'); // 'gan' or 'google-ai'
    const [chineseSpeechRate, setChineseSpeechRate] = useState(1.0); // Chinese speech rate (0.1 - 3.0)
    const [vietnameseSpeechRate, setVietnameseSpeechRate] = useState(1.0); // Vietnamese speech rate (0.1 - 3.0)
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [translation, setTranslation] = useState("");
    const [isTranslating, setIsTranslating] = useState(false);
    const [readingMode, setReadingMode] = useState('sentence'); // 'normal' or 'sentence'
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(-1);
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedChineseVoice, setSelectedChineseVoice] = useState(null);
    const [selectedVietnameseVoice, setSelectedVietnameseVoice] = useState(null);
    const [vocabulary, setVocabulary] = useState([]);
    const [showVocabulary, setShowVocabulary] = useState(false);

    // Check model status on component mount
    useEffect(() => {
        checkModelStatus();
        loadVoices();
        
        // Load saved preferences from localStorage
        const savedTemperature = localStorage.getItem('chinese-story-temperature');
        const savedChineseSpeechRate = localStorage.getItem('chinese-story-chinese-speech-rate');
        const savedVietnameseSpeechRate = localStorage.getItem('chinese-story-vietnamese-speech-rate');
        const savedMethod = localStorage.getItem('chinese-story-generation-method');
        const savedReadingMode = localStorage.getItem('chinese-story-reading-mode');
        
        if (savedTemperature) {
            setTemperature(parseFloat(savedTemperature));
        }
        if (savedChineseSpeechRate) {
            setChineseSpeechRate(parseFloat(savedChineseSpeechRate));
        }
        if (savedVietnameseSpeechRate) {
            setVietnameseSpeechRate(parseFloat(savedVietnameseSpeechRate));
        }
        if (savedMethod && (savedMethod === 'gan' || savedMethod === 'google-ai')) {
            setGenerationMethod(savedMethod);
        }
        if (savedReadingMode && (savedReadingMode === 'normal' || savedReadingMode === 'sentence')) {
            setReadingMode(savedReadingMode);
        }
        
        // Cleanup speech synthesis on component unmount
        return () => {
            speechSynthesis.cancel();
        };
    }, []);

    // Save preferences when they change
    useEffect(() => {
        localStorage.setItem('chinese-story-temperature', temperature.toString());
    }, [temperature]);

    useEffect(() => {
        localStorage.setItem('chinese-story-chinese-speech-rate', chineseSpeechRate.toString());
    }, [chineseSpeechRate]);

    useEffect(() => {
        localStorage.setItem('chinese-story-vietnamese-speech-rate', vietnameseSpeechRate.toString());
    }, [vietnameseSpeechRate]);

    useEffect(() => {
        localStorage.setItem('chinese-story-generation-method', generationMethod);
    }, [generationMethod]);

    useEffect(() => {
        localStorage.setItem('chinese-story-reading-mode', readingMode);
    }, [readingMode]);

    // Load and select the best available voices
    function loadVoices() {
        const loadVoicesHandler = () => {
            const voices = speechSynthesis.getVoices();
            setAvailableVoices(voices);
            
            // Find the best Chinese voice
            const chineseVoices = voices.filter(voice => 
                voice.lang.includes('zh') || 
                voice.lang.includes('cmn') ||
                voice.name.toLowerCase().includes('chinese') ||
                voice.name.toLowerCase().includes('mandarin')
            );
            
            // Prioritize native voices and specific models
            const bestChineseVoice = chineseVoices.find(voice => 
                voice.lang === 'zh-CN' && voice.localService
            ) || chineseVoices.find(voice => 
                voice.lang.startsWith('zh-CN')
            ) || chineseVoices.find(voice => 
                voice.lang.startsWith('zh')
            ) || chineseVoices[0];
            
            setSelectedChineseVoice(bestChineseVoice);
            
            // Find the best Vietnamese voice
            const vietnameseVoices = voices.filter(voice => 
                voice.lang.includes('vi') ||
                voice.name.toLowerCase().includes('vietnamese')
            );
            
            const bestVietnameseVoice = vietnameseVoices.find(voice => 
                voice.lang === 'vi-VN' && voice.localService
            ) || vietnameseVoices.find(voice => 
                voice.lang.startsWith('vi')
            ) || vietnameseVoices[0];
            
            setSelectedVietnameseVoice(bestVietnameseVoice);
            
            console.log('Available voices loaded:', voices.length);
            console.log('Selected Chinese voice:', bestChineseVoice?.name, bestChineseVoice?.lang);
            console.log('Selected Vietnamese voice:', bestVietnameseVoice?.name, bestVietnameseVoice?.lang);
        };

        // Load voices immediately if available
        loadVoicesHandler();
        
        // Also listen for voiceschanged event (some browsers load voices asynchronously)
        speechSynthesis.addEventListener('voiceschanged', loadVoicesHandler);
        
        return () => {
            speechSynthesis.removeEventListener('voiceschanged', loadVoicesHandler);
        };
    }

    async function checkModelStatus() {
        try {
            const res = await fetch("/api/model-status");
            const data = await res.json();
            setModelStatus(data);
        } catch (error) {
            console.error("Failed to check model status:", error);
            setModelStatus({ model_available: false, error: "Failed to check status" });
        }
    }

    async function generateStory() {
        setLoading(true);
        try {
            let res, data;
            
            if (generationMethod === 'google-ai') {
                // Use Google AI Studio API
                res = await fetch(`/api/google-ai-story?temperature=${temperature}`);
                data = await res.json();
                
                // Set the translation directly from the response
                if (data.translation) {
                    setTranslation(data.translation);
                } else {
                    setTranslation(""); // Clear if no translation provided
                }
                
                // Set vocabulary analysis if available
                if (data.vocabulary) {
                    setVocabulary(data.vocabulary);
                } else {
                    setVocabulary([]);
                }
            } else {
                // Use GAN model
                res = await fetch(`/api/story?temperature=${temperature}&useGAN=true`);
                data = await res.json();
                setTranslation(""); // Clear translation for GAN stories
                setVocabulary([]); // Clear vocabulary for GAN stories
            }
            
            setStory(data.story);
            setStoryInfo(data);
            setCurrentSentenceIndex(-1); // Reset sentence index
        } catch (error) {
            console.error("Failed to generate story:", error);
            setStory("Failed to generate story. Please try again.");
            setStoryInfo({ method: "error", error: error.message });
            setTranslation(""); // Clear translation on error
        } finally {
            setLoading(false);
        }
    }

    async function translateStory() {
        if (!story) return alert("Please generate a story first!");
        
        setIsTranslating(true);
        try {
            console.log('Sending story for translation:', story); // Debug
            
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: story })
            });
            
            console.log('Translation response status:', res.status); // Debug
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            console.log('Translation response data:', data); // Debug
            
            if (data.success) {
                setTranslation(data.translation);
            } else {
                setTranslation(data.translation || "Translation failed. Please try again.");
                console.error('Translation failed:', data.error);
            }
        } catch (error) {
            console.error("Failed to translate story:", error);
            setTranslation(`Translation error: ${error.message}. Please check the console for details.`);
        } finally {
            setIsTranslating(false);
        }
    }

    function speakStory() {
        if (!story) return alert("Please generate a story first!");
        
        // Check if speech synthesis is supported
        if (!('speechSynthesis' in window)) {
            alert("Speech synthesis is not supported in your browser. Please try using Chrome, Firefox, or Safari.");
            return;
        }
        
        // Stop any ongoing speech
        speechSynthesis.cancel();
        setCurrentSentenceIndex(-1);
        
        // Wait a bit for cancel to take effect
        setTimeout(() => {
            if (readingMode === 'sentence') {
                speakSentenceBySeentence();
            } else {
                speakNormal();
            }
        }, 100);
    }

    function speakNormal() {
        const utterance = new SpeechSynthesisUtterance(story);
        
        // Use the best available Chinese voice
        if (selectedChineseVoice) {
            utterance.voice = selectedChineseVoice;
            utterance.lang = selectedChineseVoice.lang;
        } else {
            utterance.lang = "zh-CN";
        }
        
        // Optimized speech parameters for better quality
        utterance.rate = Math.max(0.3, Math.min(2.0, chineseSpeechRate)); // Clamp rate
        utterance.pitch = 1.0; // Neutral pitch for clarity
        utterance.volume = 0.9; // Slightly lower volume to prevent distortion
        
        utterance.onstart = () => {
            setIsSpeaking(true);
            console.log('Started speaking with voice:', utterance.voice?.name || 'default');
        };
        
        utterance.onend = () => {
            setIsSpeaking(false);
            console.log('Finished speaking');
        };
        
        utterance.onerror = (event) => {
            setIsSpeaking(false);
            console.error('Speech synthesis error:', event.error);
            
            // Retry with default voice if custom voice fails
            if (utterance.voice && event.error === 'voice-unavailable') {
                console.log('Retrying with default voice...');
                const retryUtterance = new SpeechSynthesisUtterance(story);
                retryUtterance.lang = "zh-CN";
                retryUtterance.rate = chineseSpeechRate;
                retryUtterance.pitch = 1.0;
                retryUtterance.volume = 0.9;
                retryUtterance.onstart = () => setIsSpeaking(true);
                retryUtterance.onend = () => setIsSpeaking(false);
                retryUtterance.onerror = () => {
                    setIsSpeaking(false);
                    alert("Speech synthesis failed. Please try again or check your browser's speech settings.");
                };
                speechSynthesis.speak(retryUtterance);
            } else {
                alert("Speech synthesis failed. Please try again or check your browser's speech settings.");
            }
        };

        speechSynthesis.speak(utterance);
    }

    function speakSentenceBySeentence() {
        if (!translation) {
            alert("Please translate the story first for sentence-by-sentence reading!");
            return;
        }

        // Split stories into sentences
        const chineseSentences = story.split(/[。！？]/).filter(s => s.trim().length > 0);
        const vietnameseSentences = translation.split(/[.!?]/).filter(s => s.trim().length > 0);
        
        if (chineseSentences.length === 0) {
            alert("No sentences found in the story!");
            return;
        }

        setIsSpeaking(true);
        setCurrentSentenceIndex(0);
        speakSentenceSequence(chineseSentences, vietnameseSentences, 0);
    }

    function speakSentenceSequence(chineseSentences, vietnameseSentences, index) {
        if (index >= chineseSentences.length) {
            // Finished all sentences
            setIsSpeaking(false);
            setCurrentSentenceIndex(-1);
            return;
        }

        setCurrentSentenceIndex(index);
        const chineseSentence = chineseSentences[index].trim();
        const vietnameseSentence = vietnameseSentences[index]?.trim() || "Không có bản dịch";

        // Pattern: Vietnamese -> Chinese -> Chinese
        speakSequence([
            { text: vietnameseSentence, lang: "vi-VN", label: "Vietnamese" },
            { text: chineseSentence, lang: "zh-CN", label: "Chinese (1st)" },
            { text: chineseSentence, lang: "zh-CN", label: "Chinese (2nd)" }
        ], 0, () => {
            // Move to next sentence after a short pause
            setTimeout(() => {
                speakSentenceSequence(chineseSentences, vietnameseSentences, index + 1);
            }, 800);
        });
    }

    function speakSequence(utterances, index, onComplete) {
        if (index >= utterances.length) {
            onComplete();
            return;
        }

        const { text, lang, label } = utterances[index];
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Select the best voice based on language
        if (lang === 'zh-CN' && selectedChineseVoice) {
            utterance.voice = selectedChineseVoice;
            utterance.lang = selectedChineseVoice.lang;
        } else if (lang === 'vi-VN' && selectedVietnameseVoice) {
            utterance.voice = selectedVietnameseVoice;
            utterance.lang = selectedVietnameseVoice.lang;
        } else {
            utterance.lang = lang;
        }
        
        // Optimized speech parameters
        utterance.rate = Math.max(0.3, Math.min(2.0, lang === 'vi-VN' ? vietnameseSpeechRate : chineseSpeechRate));
        utterance.pitch = lang === 'vi-VN' ? 1.1 : 1.0; // Slightly higher pitch for Vietnamese
        utterance.volume = 0.9;

        utterance.onstart = () => {
            console.log(`Speaking ${label}: ${text.substring(0, 30)}...`);
        };

        utterance.onend = () => {
            console.log(`Finished ${label}`);
            // Pause between utterances for better comprehension
            const pauseDuration = lang === 'vi-VN' ? 600 : 400; // Longer pause after Vietnamese
            setTimeout(() => {
                speakSequence(utterances, index + 1, onComplete);
            }, pauseDuration);
        };

        utterance.onerror = (event) => {
            console.error(`Speech error for ${label}:`, event.error);
            
            // Retry with default voice if custom voice fails
            if (utterance.voice && event.error === 'voice-unavailable') {
                console.log(`Retrying ${label} with default voice...`);
                const retryUtterance = new SpeechSynthesisUtterance(text);
                retryUtterance.lang = lang;
                retryUtterance.rate = lang === 'vi-VN' ? vietnameseSpeechRate : chineseSpeechRate;
                retryUtterance.pitch = lang === 'vi-VN' ? 1.1 : 1.0;
                retryUtterance.volume = 0.9;
                retryUtterance.onend = () => {
                    setTimeout(() => {
                        speakSequence(utterances, index + 1, onComplete);
                    }, 500);
                };
                retryUtterance.onerror = () => {
                    // If retry also fails, continue to next utterance
                    console.error(`Retry failed for ${label}, skipping...`);
                    setTimeout(() => {
                        speakSequence(utterances, index + 1, onComplete);
                    }, 300);
                };
                speechSynthesis.speak(retryUtterance);
            } else {
                // Continue to next utterance even if current one fails
                console.error(`Skipping failed utterance: ${label}`);
                setTimeout(() => {
                    speakSequence(utterances, index + 1, onComplete);
                }, 300);
            }
        };

        speechSynthesis.speak(utterance);
    }

    function stopSpeaking() {
        speechSynthesis.cancel();
        setIsSpeaking(false);
        setCurrentSentenceIndex(-1);
    }

    function testVoice(lang = 'zh-CN') {
        const testText = lang === 'zh-CN' ? '你好，这是中文语音测试。' : 'Xin chào, đây là bài kiểm tra giọng nói tiếng Việt.';
        const utterance = new SpeechSynthesisUtterance(testText);
        
        if (lang === 'zh-CN' && selectedChineseVoice) {
            utterance.voice = selectedChineseVoice;
            utterance.lang = selectedChineseVoice.lang;
        } else if (lang === 'vi-VN' && selectedVietnameseVoice) {
            utterance.voice = selectedVietnameseVoice;
            utterance.lang = selectedVietnameseVoice.lang;
        } else {
            utterance.lang = lang;
        }
        
        utterance.rate = lang === 'vi-VN' ? vietnameseSpeechRate : chineseSpeechRate;
        utterance.pitch = lang === 'vi-VN' ? 1.1 : 1.0;
        utterance.volume = 0.9;
        
        speechSynthesis.speak(utterance);
    }

    // Function to speak vocabulary: Vietnamese meaning → Chinese word (2 times)
    function speakVocabulary(vocabItem) {
        if (!('speechSynthesis' in window)) {
            alert("Speech synthesis not supported in this browser.");
            return;
        }

        speechSynthesis.cancel();

        const speakSequence = async () => {
            // First speak Vietnamese meaning
            const vietnameseUtterance = new SpeechSynthesisUtterance(vocabItem.vietnamese);
            if (selectedVietnameseVoice) {
                vietnameseUtterance.voice = selectedVietnameseVoice;
                vietnameseUtterance.lang = selectedVietnameseVoice.lang;
            } else {
                vietnameseUtterance.lang = 'vi-VN';
            }
            vietnameseUtterance.rate = vietnameseSpeechRate;
            vietnameseUtterance.pitch = 1.1;
            vietnameseUtterance.volume = 0.9;

            speechSynthesis.speak(vietnameseUtterance);

            // Wait for Vietnamese to finish, then speak Chinese twice
            vietnameseUtterance.onend = () => {
                setTimeout(() => {
                    // First Chinese pronunciation
                    const chineseUtterance1 = new SpeechSynthesisUtterance(vocabItem.chinese);
                    if (selectedChineseVoice) {
                        chineseUtterance1.voice = selectedChineseVoice;
                        chineseUtterance1.lang = selectedChineseVoice.lang;
                    } else {
                        chineseUtterance1.lang = 'zh-CN';
                    }
                    chineseUtterance1.rate = chineseSpeechRate * 0.9; // Slightly slower for clarity
                    chineseUtterance1.pitch = 1.0;
                    chineseUtterance1.volume = 0.9;

                    speechSynthesis.speak(chineseUtterance1);

                    // Second Chinese pronunciation
                    chineseUtterance1.onend = () => {
                        setTimeout(() => {
                            const chineseUtterance2 = new SpeechSynthesisUtterance(vocabItem.chinese);
                            if (selectedChineseVoice) {
                                chineseUtterance2.voice = selectedChineseVoice;
                                chineseUtterance2.lang = selectedChineseVoice.lang;
                            } else {
                                chineseUtterance2.lang = 'zh-CN';
                            }
                            chineseUtterance2.rate = chineseSpeechRate * 0.9;
                            chineseUtterance2.pitch = 1.0;
                            chineseUtterance2.volume = 0.9;

                            speechSynthesis.speak(chineseUtterance2);
                        }, 500); // 0.5 second pause between repetitions
                    };
                }, 800); // 0.8 second pause between Vietnamese and Chinese
            };
        };

        speakSequence();
    }

    return (
        <div style={{ padding: "30px", fontFamily: "Arial, sans-serif" }}>
            <h1>Chinese Story Generator</h1>
            
            {/* Generation Method Selection */}
            <div style={{ 
                marginBottom: "20px", 
                padding: "15px", 
                backgroundColor: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "5px"
            }}>
                <h3 style={{ marginTop: 0 }}>Choose generation method:</h3>
                <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                    <label style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        padding: "10px", 
                        backgroundColor: generationMethod === 'gan' ? "#007bff" : "#fff",
                        color: generationMethod === 'gan' ? "#fff" : "#000",
                        border: "2px solid #007bff",
                        borderRadius: "5px",
                        cursor: "pointer"
                    }}>
                        <input 
                            type="radio" 
                            value="gan" 
                            checked={generationMethod === 'gan'}
                            onChange={(e) => setGenerationMethod(e.target.value)}
                            style={{ marginRight: "8px" }}
                        />
                        🤖 GAN
                    </label>
                    
                    <label style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        padding: "10px", 
                        backgroundColor: generationMethod === 'google-ai' ? "#28a745" : "#fff",
                        color: generationMethod === 'google-ai' ? "#fff" : "#000",
                        border: "2px solid #28a745",
                        borderRadius: "5px",
                        cursor: "pointer"
                    }}>
                        <input 
                            type="radio" 
                            value="google-ai" 
                            checked={generationMethod === 'google-ai'}
                            onChange={(e) => setGenerationMethod(e.target.value)}
                            style={{ marginRight: "8px" }}
                        />
                        🌟 Gemini
                    </label>
                </div>
            </div>

            {/* Model Status - Only show for GAN method */}
            {generationMethod === 'gan' && (
                <div style={{ 
                    marginBottom: "20px", 
                    padding: "10px", 
                    backgroundColor: modelStatus?.model_available ? "#d4edda" : "#f8d7da",
                    border: `1px solid ${modelStatus?.model_available ? "#c3e6cb" : "#f5c6cb"}`,
                    borderRadius: "5px"
                }}>
                    <strong>GAN status:</strong> {
                        modelStatus === null ? "Checking..." :
                        modelStatus.model_available ? "✅ Using GAN" : "❌ BUG"
                    }
                    {modelStatus?.error && <div style={{ fontSize: "12px", color: "#721c24" }}>Error: {modelStatus.error}</div>}
                </div>
            )}

            {/* Google AI Info */}
            {generationMethod === 'google-ai' && (
                <div style={{ 
                    marginBottom: "20px", 
                    padding: "10px", 
                    backgroundColor: "#d1ecf1",
                    border: "1px solid #bee5eb",
                    borderRadius: "5px"
                }}>
                    <strong>Gemini status:</strong> ✅ Using Gemini
                </div>
            )}

            {/* Controls */}
            <div style={{ marginBottom: "20px" }}>
                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px" }}>
                        <strong>Creativity:</strong> {temperature}
                    </label>
                    <input 
                        type="range" 
                        min="0.1" 
                        max="2.0" 
                        step="0.1" 
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        style={{ width: "100%", maxWidth: "300px" }}
                    />
                </div>

                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px" }}>
                        <strong>🇨🇳 Speed:</strong> {chineseSpeechRate}x
                    </label>
                    <input 
                        type="range" 
                        min="0.3" 
                        max="2.5" 
                        step="0.1" 
                        value={chineseSpeechRate}
                        onChange={(e) => setChineseSpeechRate(parseFloat(e.target.value))}
                        style={{ width: "100%", maxWidth: "300px" }}
                    />
                    
                    {/* Chinese Speech Rate Presets */}
                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "15px" }}>
                        {[
                            { label: "Slow", value: 0.6 },
                            { label: "Normal", value: 1.0 },
                            { label: "Fast", value: 1.5 },
                            { label: "Very Fast", value: 2.0 }
                        ].map((preset) => (
                            <button
                                key={`chinese-${preset.label}`}
                                onClick={() => setChineseSpeechRate(preset.value)}
                                style={{
                                    padding: "4px 8px",
                                    fontSize: "11px",
                                    backgroundColor: Math.abs(chineseSpeechRate - preset.value) < 0.05 ? "#007bff" : "#f8f9fa",
                                    color: Math.abs(chineseSpeechRate - preset.value) < 0.05 ? "white" : "#333",
                                    border: "1px solid #dee2e6",
                                    borderRadius: "3px",
                                    cursor: "pointer"
                                }}
                            >
                                {preset.value}x
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px" }}>
                        <strong>🇻🇳 Speed:</strong> {vietnameseSpeechRate}x
                    </label>
                    <input 
                        type="range" 
                        min="0.3" 
                        max="2.5" 
                        step="0.1" 
                        value={vietnameseSpeechRate}
                        onChange={(e) => setVietnameseSpeechRate(parseFloat(e.target.value))}
                        style={{ width: "100%", maxWidth: "300px" }}
                    />
                    
                    {/* Vietnamese Speech Rate Presets */}
                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        {[
                            { label: "Slow", value: 0.6 },
                            { label: "Normal", value: 1.0 },
                            { label: "Fast", value: 1.5 },
                            { label: "Very Fast", value: 2.0 }
                        ].map((preset) => (
                            <button
                                key={`vietnamese-${preset.label}`}
                                onClick={() => setVietnameseSpeechRate(preset.value)}
                                style={{
                                    padding: "4px 8px",
                                    fontSize: "11px",
                                    backgroundColor: Math.abs(vietnameseSpeechRate - preset.value) < 0.05 ? "#007bff" : "#f8f9fa",
                                    color: Math.abs(vietnameseSpeechRate - preset.value) < 0.05 ? "white" : "#333",
                                    border: "1px solid #dee2e6",
                                    borderRadius: "3px",
                                    cursor: "pointer"
                                }}
                            >
                                {preset.value}x
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: "15px" }}>
                    <label style={{ display: "block", marginBottom: "5px" }}>
                        <strong>Reading Mode:</strong>
                    </label>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <label style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            padding: "8px 12px", 
                            backgroundColor: readingMode === 'normal' ? "#17a2b8" : "#f8f9fa",
                            color: readingMode === 'normal' ? "#fff" : "#000",
                            border: "2px solid #17a2b8",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontSize: "14px"
                        }}>
                            <input 
                                type="radio" 
                                value="normal" 
                                checked={readingMode === 'normal'}
                                onChange={(e) => setReadingMode(e.target.value)}
                                style={{ marginRight: "6px" }}
                            />
                            Normal reading
                        </label>
                        
                        <label style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            padding: "8px 12px", 
                            backgroundColor: readingMode === 'sentence' ? "#fd7e14" : "#f8f9fa",
                            color: readingMode === 'sentence' ? "#fff" : "#000",
                            border: "2px solid #fd7e14",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontSize: "14px"
                        }}>
                            <input 
                                type="radio" 
                                value="sentence" 
                                checked={readingMode === 'sentence'}
                                onChange={(e) => setReadingMode(e.target.value)}
                                style={{ marginRight: "6px" }}
                            />
                            Sentence reading
                        </label>
                    </div>
                    
                    {/* Voice Information */}
                    <div style={{ fontSize: "10px", color: "#555", marginTop: "8px", padding: "6px", backgroundColor: "#f1f3f4", borderRadius: "3px" }}>
                        <div><strong>Voice quality:</strong></div>
                        <div>🇨🇳 Chinese: {selectedChineseVoice ? `${selectedChineseVoice.name} (${selectedChineseVoice.lang})` : 'Default system voice'}</div>
                        <div>🇻🇳 Vietnamese: {selectedVietnameseVoice ? `${selectedVietnameseVoice.name} (${selectedVietnameseVoice.lang})` : 'Default system voice'}</div>
                        <div style={{ marginTop: "2px", fontStyle: "italic" }}>
                            {availableVoices.length > 0 ? `${availableVoices.length} voices available` : 'Loading voices...'}
                        </div>
                        <div style={{ marginTop: "4px", display: "flex", gap: "6px" }}>
                            <button 
                                onClick={() => testVoice('zh-CN')}
                                style={{
                                    padding: "2px 6px",
                                    fontSize: "9px",
                                    backgroundColor: "#007bff",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "2px",
                                    cursor: "pointer"
                                }}
                            >
                                Test 🇨🇳
                            </button>
                            <button 
                                onClick={() => testVoice('vi-VN')}
                                style={{
                                    padding: "2px 6px",
                                    fontSize: "9px",
                                    backgroundColor: "#28a745",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "2px",
                                    cursor: "pointer"
                                }}
                            >
                                Test 🇻🇳
                            </button>
                        </div>
                    </div>
                </div>
                
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                    <button 
                        onClick={generateStory} 
                        disabled={loading}
                        style={{ 
                            padding: "12px 24px",
                            backgroundColor: loading ? "#ccc" : (generationMethod === 'google-ai' ? "#28a745" : "#007bff"),
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: loading ? "not-allowed" : "pointer",
                            fontSize: "16px",
                            fontWeight: "bold"
                        }}
                    >
                        {loading ? "Generating..." : `Generate story`}
                    </button>

                    {/* Only show translate button for GAN stories */}
                    {generationMethod === 'gan' && (
                        <button 
                            onClick={translateStory} 
                            disabled={!story || isTranslating || loading}
                            style={{ 
                                padding: "10px 20px",
                                backgroundColor: !story || isTranslating || loading ? "#ccc" : "#6f42c1",
                                color: "white",
                                border: "none",
                                borderRadius: "5px",
                                cursor: !story || isTranslating || loading ? "not-allowed" : "pointer",
                                fontSize: "14px"
                            }}
                        >
                            {isTranslating ? "🔄 Translating..." : "🌏 Translate to Vietnamese"}
                        </button>
                    )}
                    
                    <button 
                        onClick={speakStory} 
                        disabled={!story || loading || isSpeaking || (readingMode === 'sentence' && !translation)}
                        style={{ 
                            padding: "10px 20px",
                            backgroundColor: !story || loading || isSpeaking || (readingMode === 'sentence' && !translation) ? "#ccc" : "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: !story || loading || isSpeaking || (readingMode === 'sentence' && !translation) ? "not-allowed" : "pointer",
                            fontSize: "14px"
                        }}
                    >
                        {isSpeaking ? "🔊" : "🔊"}
                        {currentSentenceIndex >= 0 && ` (${currentSentenceIndex + 1})`}
                    </button>

                    {isSpeaking && (
                        <button 
                            onClick={stopSpeaking}
                            style={{ 
                                padding: "10px 20px",
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer",
                                fontSize: "14px"
                            }}
                        >
                            🛑
                        </button>
                    )}

                    <button 
                        onClick={checkModelStatus}
                        disabled={generationMethod !== 'gan'}
                        style={{ 
                            padding: "10px",
                            backgroundColor: generationMethod !== 'gan' ? "#ccc" : "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: generationMethod !== 'gan' ? "not-allowed" : "pointer",
                            fontSize: "12px"
                        }}
                    >
                        Refresh GAN status
                    </button>
                </div>
            </div>

            {/* Story Display */}
            <div style={{ 
                marginTop: "20px", 
                padding: "15px", 
                border: "1px solid #ddd", 
                backgroundColor: "#fff", 
                minHeight: "100px", 
                fontSize: "20px",
                borderRadius: "5px"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h3 style={{ margin: 0, color: "#333" }}>🇨🇳 Chinese story</h3>
                    {currentSentenceIndex >= 0 && (
                        <span style={{ 
                            fontSize: "14px", 
                            backgroundColor: "#ffc107", 
                            color: "#000", 
                            padding: "4px 8px", 
                            borderRadius: "4px",
                            fontWeight: "bold"
                        }}>
                            Reading sentence {currentSentenceIndex + 1}
                        </span>
                    )}
                </div>
                {story || "Click 'Generate story' to create a new Chinese story!"}
            </div>

            {/* Translation Display */}
            {translation && (
                <div style={{ 
                    marginTop: "15px", 
                    padding: "15px", 
                    border: "1px solid #6f42c1", 
                    backgroundColor: "#f8f4ff", 
                    minHeight: "80px", 
                    fontSize: "18px",
                    borderRadius: "5px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <h3 style={{ margin: 0, color: "#6f42c1" }}>🇻🇳 Vietnamese translation</h3>
                        {translation.includes('[Dịch đơn giản]') && (
                            <span style={{
                                fontSize: "12px",
                                backgroundColor: "#ffc107",
                                color: "#000",
                                padding: "4px 8px",
                                borderRadius: "4px"
                            }}>
                                Fallback Translation
                            </span>
                        )}
                    </div>
                    {translation}
                </div>
            )}

            {/* Vocabulary Analysis Section */}
            {vocabulary && vocabulary.length > 0 && (
                <div style={{ 
                    marginTop: "15px", 
                    padding: "15px", 
                    border: "1px solid #28a745", 
                    backgroundColor: "#f8fff8", 
                    borderRadius: "5px"
                }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                        <h3 style={{ margin: 0, color: "#28a745" }}>📚 Vocabulary</h3>
                        <button
                            onClick={() => setShowVocabulary(!showVocabulary)}
                            style={{
                                padding: "8px 12px",
                                backgroundColor: "#28a745",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "14px"
                            }}
                        >
                            {showVocabulary ? 'Hide' : 'Show'} Vocabulary ({vocabulary.length} words)
                        </button>
                    </div>
                    
                    {showVocabulary && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "10px" }}>
                            {vocabulary.map((vocabItem, index) => (
                                <div 
                                    key={index}
                                    style={{
                                        padding: "12px",
                                        border: "1px solid #d4edda",
                                        borderRadius: "5px",
                                        backgroundColor: "white",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                    }}
                                >
                                    <div style={{ marginBottom: "8px" }}>
                                        <span style={{ 
                                            fontSize: "18px", 
                                            fontWeight: "bold", 
                                            color: "#dc3545" 
                                        }}>
                                            {vocabItem.chinese}
                                        </span>
                                        <span style={{ 
                                            marginLeft: "8px", 
                                            fontSize: "14px", 
                                            color: "#6c757d",
                                            fontStyle: "italic"
                                        }}>
                                            ({vocabItem.pinyin})
                                        </span>
                                    </div>
                                    <div style={{ 
                                        fontSize: "16px", 
                                        color: "#495057",
                                        marginBottom: "10px"
                                    }}>
                                        🇻🇳 {vocabItem.vietnamese}
                                    </div>
                                    <button
                                        onClick={() => speakVocabulary(vocabItem)}
                                        style={{
                                            padding: "6px 12px",
                                            backgroundColor: "#007bff",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "3px",
                                            cursor: "pointer",
                                            fontSize: "12px"
                                        }}
                                    >
                                        🔊
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Story Info */}
            {storyInfo && (
                <div style={{ 
                    marginTop: "10px", 
                    padding: "10px", 
                    fontSize: "12px", 
                    color: "#666",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "5px"
                }}>
                    <strong>Generation Info:</strong> 
                    Method: {storyInfo.method?.toUpperCase() || "Unknown"} | 
                    Model: {storyInfo.model || "Unknown"} | 
                    Temperature: {storyInfo.temperature} | 
                    Available: {storyInfo.model_available ? "Yes" : "No"}
                    {storyInfo.error && <span style={{ color: "#dc3545" }}> | Error: {storyInfo.error}</span>}
                    <br />
                    <strong>Speech Settings:</strong> 
                    Chinese Rate: {chineseSpeechRate}x | Vietnamese Rate: {vietnameseSpeechRate}x | 
                    Mode: {readingMode === 'sentence' ? 'Sentence Learning (VN→CN→CN)' : 'Normal (CN only)'} | 
                    Language: Chinese (zh-CN) + Vietnamese (vi-VN) | 
                    Status: {isSpeaking ? "🔊" : "⏸️"}
                    <br />
                    <strong>Translation:</strong> 
                    {translation ? "✅ Available" : "❌ Not translated"} | 
                    Required for sentence mode: {readingMode === 'sentence' ? "Yes" : "No"}
                </div>
            )}
        </div>
    );
}