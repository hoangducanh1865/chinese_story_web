#!/usr/bin/env python3
"""
Simple CLI interface for Chinese Story GAN
This script can be called from Node.js using child_process
"""

import sys
import json
import os
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from train_model import load_trained_model
except ImportError as e:
    print(json.dumps({"error": f"Failed to import modules: {str(e)}"}))
    sys.exit(1)

def generate_story_cli(temperature=0.8):
    """Generate story via command line interface"""
    try:
        # Try to load the trained model
        model = load_trained_model()
        
        if model is None:
            # Return a fallback story if model is not available
            fallback_stories = [
                "小明今天去学校。他很喜欢学习中文。老师教他很多新的汉字。今天是美好的一天。",
                "昨天下雨了。小红在家里看书。她喜欢读有趣的故事。妈妈给她做了热茶。",
                "爸爸妈妈去超市买菜。他们买了很多新鲜的水果和蔬菜。晚上全家一起吃饭。",
                "我的朋友来我家玩。我们一起看电影，吃好吃的零食。度过了愉快的时光。",
                "春天来了。花儿开了，树叶绿了。公园里有很多人在散步。空气很清新。"
            ]
            import random
            story = random.choice(fallback_stories)
            result = {
                "story": story,
                "method": "fallback",
                "temperature": temperature,
                "model_available": False
            }
        else:
            # Generate using the GAN model
            story = model.generate_story(temperature=temperature)
            
            # Clean up the story
            story = story.replace('<s>', '').replace('</s>', '').replace('<UNK>', '').replace('<PAD>', '').strip()
            
            # If story is too short, use fallback
            if len(story) < 10:
                story = "今天天气很好。小明和朋友们一起去公园玩。他们看到了很多美丽的花朵和绿色的树木。大家都很开心。"
                method = "fallback"
            else:
                method = "gan"
            
            result = {
                "story": story,
                "method": method,
                "temperature": temperature,
                "model_available": True
            }
        
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        # Always provide a fallback in case of any error
        fallback_story = "从前有一个小村庄，住着一个善良的女孩。她每天都帮助村里的人们。有一天，她发现了一朵神奇的花。"
        error_result = {
            "story": fallback_story,
            "method": "fallback",
            "temperature": temperature,
            "model_available": False,
            "error": str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False))

def main():
    parser = argparse.ArgumentParser(description='Generate Chinese stories using GAN')
    parser.add_argument('--temperature', type=float, default=0.8, 
                       help='Temperature for story generation (0.1-2.0)')
    parser.add_argument('--action', type=str, default='generate',
                       choices=['generate', 'status'],
                       help='Action to perform')
    
    args = parser.parse_args()
    
    if args.action == 'generate':
        # Clamp temperature
        temperature = max(0.1, min(2.0, args.temperature))
        generate_story_cli(temperature)
    elif args.action == 'status':
        try:
            model = load_trained_model()
            status = {
                "model_available": model is not None,
                "model_type": "Chinese Story GAN" if model else None
            }
            print(json.dumps(status, ensure_ascii=False))
        except Exception as e:
            status = {
                "model_available": False,
                "error": str(e)
            }
            print(json.dumps(status, ensure_ascii=False))

if __name__ == "__main__":
    main()
