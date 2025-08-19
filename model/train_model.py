from chinese_story_gan import ChineseStoryGAN
import json
import os

def load_training_data():
    """Load Chinese stories for training"""
    # Sample Chinese stories - in practice, you'd load from a large dataset
    stories = [
        "小明今天去学校。他很喜欢学习中文。老师教他很多新的汉字。",
        "昨天下雨了。小红在家里看书。她喜欢读有趣的故事。",
        "爸爸妈妈去超市买菜。他们买了很多新鲜的水果和蔬菜。",
        "我的朋友来我家玩。我们一起看电影，吃好吃的零食。",
        "春天来了。花儿开了，树叶绿了。公园里有很多人在散步。",
        "小猫很可爱。它喜欢玩毛线球。每天晚上它都睡在我的床上。",
        "今天是周末。我和家人去公园玩。我们看到了很多美丽的花。",
        "老师给我们讲了一个有趣的故事。故事里有勇敢的王子和美丽的公主。",
        "我喜欢吃妈妈做的饭。她做的菜很好吃，特别是红烧肉。",
        "图书馆里有很多书。我经常去那里读书和学习。那里很安静。"
    ]
    
    # You can also load from external files
    # with open('chinese_stories.txt', 'r', encoding='utf-8') as f:
    #     stories = f.readlines()
    
    return stories

def train_model():
    """Train the GAN model"""
    print("Loading training data...")
    stories = load_training_data()
    
    print("Initializing GAN model...")
    gan = ChineseStoryGAN(
        vocab_size=3000,
        embedding_dim=128,
        hidden_dim=256,
        num_layers=2,
        max_length=50
    )
    
    print("Training model...")
    gan.train(stories, epochs=50, batch_size=8)
    
    print("Saving model...")
    model_path = os.path.join(os.path.dirname(__file__), 'chinese_story_model.pth')
    gan.save_model(model_path)
    
    print(f"Model saved to {model_path}")
    
    # Test generation
    print("\nGenerating sample stories:")
    for i in range(3):
        story = gan.generate_story(temperature=0.8)
        print(f"Story {i+1}: {story}")

def load_trained_model():
    """Load the trained model"""
    model_path = os.path.join(os.path.dirname(__file__), 'chinese_story_model.pth')
    
    if not os.path.exists(model_path):
        print("Model not found. Please train the model first.")
        return None
    
    gan = ChineseStoryGAN()
    gan.load_model(model_path)
    return gan

def generate_story_api(temperature=0.8, length=50):
    """API function to generate story"""
    gan = load_trained_model()
    if gan is None:
        return "Model not available. Please train the model first."
    
    story = gan.generate_story(temperature=temperature)
    return story

if __name__ == "__main__":
    # Train the model
    train_model()
    
    # Test generation
    print("\nTesting story generation:")
    for i in range(5):
        story = generate_story_api()
        print(f"Generated story {i+1}: {story}")
