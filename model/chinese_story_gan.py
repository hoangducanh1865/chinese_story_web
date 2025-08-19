import torch
import torch.nn as nn
import torch.optim as optim
import jieba
import numpy as np
import json
import random
from collections import Counter
import pickle
import os

class Generator(nn.Module):
    def __init__(self, vocab_size, embedding_dim, hidden_dim, num_layers, max_length):
        super(Generator, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.max_length = max_length
        self.vocab_size = vocab_size
        
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, num_layers, batch_first=True)
        self.linear = nn.Linear(hidden_dim, vocab_size)
        self.softmax = nn.LogSoftmax(dim=2)
        
    def forward(self, input_seq, hidden=None):
        embedded = self.embedding(input_seq)
        if hidden is None:
            output, hidden = self.lstm(embedded)
        else:
            output, hidden = self.lstm(embedded, hidden)
        output = self.linear(output)
        output = self.softmax(output)
        return output, hidden
    
    def generate_text(self, start_token, word_to_idx, idx_to_word, temperature=1.0):
        self.eval()
        with torch.no_grad():
            generated = [start_token]
            hidden = None
            
            for _ in range(self.max_length):
                input_seq = torch.tensor([generated[-1]]).unsqueeze(0)
                output, hidden = self.forward(input_seq, hidden)
                
                # Apply temperature
                output = output.squeeze(0)[-1] / temperature
                probabilities = torch.softmax(output, dim=0)
                
                # Sample from the distribution
                next_token = torch.multinomial(probabilities, 1).item()
                generated.append(next_token)
                
                # Stop if we hit end token or max length
                if next_token == word_to_idx.get('</s>', 1) or len(generated) >= self.max_length:
                    break
            
            # Convert tokens back to words
            words = [idx_to_word.get(idx, '<UNK>') for idx in generated[1:]]  # Skip start token
            return ''.join(words)

class Discriminator(nn.Module):
    def __init__(self, vocab_size, embedding_dim, hidden_dim, num_layers):
        super(Discriminator, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, num_layers, batch_first=True)
        self.linear = nn.Linear(hidden_dim, 1)
        self.sigmoid = nn.Sigmoid()
        
    def forward(self, input_seq):
        embedded = self.embedding(input_seq)
        output, (hidden, _) = self.lstm(embedded)
        # Use the last hidden state
        output = self.linear(hidden[-1])
        output = self.sigmoid(output)
        return output

class ChineseStoryGAN:
    def __init__(self, vocab_size=5000, embedding_dim=128, hidden_dim=256, num_layers=2, max_length=100):
        self.vocab_size = vocab_size
        self.embedding_dim = embedding_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.max_length = max_length
        
        self.generator = Generator(vocab_size, embedding_dim, hidden_dim, num_layers, max_length)
        self.discriminator = Discriminator(vocab_size, embedding_dim, hidden_dim, num_layers)
        
        self.word_to_idx = {}
        self.idx_to_word = {}
        
    def build_vocabulary(self, texts):
        """Build vocabulary from training texts"""
        all_words = []
        for text in texts:
            words = list(jieba.cut(text))
            all_words.extend(words)
        
        # Count word frequencies
        word_counts = Counter(all_words)
        
        # Keep most common words
        most_common = word_counts.most_common(self.vocab_size - 4)  # Reserve space for special tokens
        
        # Build vocabulary
        self.word_to_idx = {'<PAD>': 0, '<UNK>': 1, '<s>': 2, '</s>': 3}
        self.idx_to_word = {0: '<PAD>', 1: '<UNK>', 2: '<s>', 3: '</s>'}
        
        for word, _ in most_common:
            idx = len(self.word_to_idx)
            self.word_to_idx[word] = idx
            self.idx_to_word[idx] = word
        
        return self.word_to_idx, self.idx_to_word
    
    def text_to_sequence(self, text):
        """Convert text to sequence of indices"""
        words = list(jieba.cut(text))
        sequence = [self.word_to_idx.get('<s>', 2)]  # Start token
        for word in words:
            sequence.append(self.word_to_idx.get(word, 1))  # Unknown token if not in vocab
        sequence.append(self.word_to_idx.get('</s>', 3))  # End token
        return sequence
    
    def prepare_training_data(self, texts):
        """Prepare training data from texts"""
        sequences = []
        for text in texts:
            seq = self.text_to_sequence(text)
            if len(seq) <= self.max_length:
                sequences.append(seq)
        
        # Pad sequences
        max_len = max(len(seq) for seq in sequences)
        padded_sequences = []
        for seq in sequences:
            padded = seq + [0] * (max_len - len(seq))  # Pad with <PAD> token
            padded_sequences.append(padded)
        
        return torch.tensor(padded_sequences)
    
    def train(self, texts, epochs=100, batch_size=32, lr_g=0.0002, lr_d=0.0002):
        """Train the GAN"""
        # Build vocabulary
        self.build_vocabulary(texts)
        
        # Prepare training data
        real_data = self.prepare_training_data(texts)
        
        # Optimizers
        optimizer_g = optim.Adam(self.generator.parameters(), lr=lr_g)
        optimizer_d = optim.Adam(self.discriminator.parameters(), lr=lr_d)
        
        # Loss function
        criterion = nn.BCELoss()
        
        for epoch in range(epochs):
            # Train Discriminator
            self.discriminator.train()
            self.generator.eval()
            
            # Real data
            real_batch = real_data[torch.randperm(len(real_data))[:batch_size]]
            real_labels = torch.ones(batch_size, 1)
            
            # Fake data
            fake_batch = self.generate_fake_batch(batch_size)
            fake_labels = torch.zeros(batch_size, 1)
            
            # Train discriminator on real data
            optimizer_d.zero_grad()
            real_output = self.discriminator(real_batch)
            real_loss = criterion(real_output, real_labels)
            
            # Train discriminator on fake data
            fake_output = self.discriminator(fake_batch.detach())
            fake_loss = criterion(fake_output, fake_labels)
            
            d_loss = real_loss + fake_loss
            d_loss.backward()
            optimizer_d.step()
            
            # Train Generator
            self.generator.train()
            optimizer_g.zero_grad()
            
            fake_batch = self.generate_fake_batch(batch_size)
            fake_output = self.discriminator(fake_batch)
            g_loss = criterion(fake_output, real_labels)  # Want discriminator to think fake is real
            
            g_loss.backward()
            optimizer_g.step()
            
            if epoch % 10 == 0:
                print(f"Epoch {epoch}: D_loss = {d_loss.item():.4f}, G_loss = {g_loss.item():.4f}")
                
                # Generate sample text
                sample_text = self.generate_story()
                print(f"Sample: {sample_text}")
    
    def generate_fake_batch(self, batch_size):
        """Generate fake batch for training"""
        fake_sequences = []
        
        for _ in range(batch_size):
            # Generate sequence using current generator
            start_token = self.word_to_idx.get('<s>', 2)
            sequence = [start_token]
            hidden = None
            
            self.generator.eval()
            with torch.no_grad():
                for _ in range(self.max_length - 1):
                    input_seq = torch.tensor([sequence[-1]]).unsqueeze(0)
                    output, hidden = self.generator(input_seq, hidden)
                    
                    # Sample from output distribution
                    probabilities = torch.softmax(output.squeeze(0)[-1], dim=0)
                    next_token = torch.multinomial(probabilities, 1).item()
                    sequence.append(next_token)
                    
                    if next_token == self.word_to_idx.get('</s>', 3):
                        break
            
            # Pad sequence to max_length
            while len(sequence) < self.max_length:
                sequence.append(0)  # Pad token
            
            fake_sequences.append(sequence[:self.max_length])
        
        return torch.tensor(fake_sequences)
    
    def generate_story(self, temperature=1.0):
        """Generate a Chinese story"""
        start_token = self.word_to_idx.get('<s>', 2)
        return self.generator.generate_text(start_token, self.word_to_idx, self.idx_to_word, temperature)
    
    def save_model(self, path):
        """Save the trained model"""
        torch.save({
            'generator_state_dict': self.generator.state_dict(),
            'discriminator_state_dict': self.discriminator.state_dict(),
            'word_to_idx': self.word_to_idx,
            'idx_to_word': self.idx_to_word,
            'vocab_size': self.vocab_size,
            'embedding_dim': self.embedding_dim,
            'hidden_dim': self.hidden_dim,
            'num_layers': self.num_layers,
            'max_length': self.max_length
        }, path)
    
    def load_model(self, path):
        """Load a trained model"""
        checkpoint = torch.load(path, map_location='cpu')
        
        self.vocab_size = checkpoint['vocab_size']
        self.embedding_dim = checkpoint['embedding_dim']
        self.hidden_dim = checkpoint['hidden_dim']
        self.num_layers = checkpoint['num_layers']
        self.max_length = checkpoint['max_length']
        
        self.generator = Generator(self.vocab_size, self.embedding_dim, self.hidden_dim, 
                                 self.num_layers, self.max_length)
        self.discriminator = Discriminator(self.vocab_size, self.embedding_dim, self.hidden_dim, 
                                         self.num_layers)
        
        self.generator.load_state_dict(checkpoint['generator_state_dict'])
        self.discriminator.load_state_dict(checkpoint['discriminator_state_dict'])
        
        self.word_to_idx = checkpoint['word_to_idx']
        self.idx_to_word = checkpoint['idx_to_word']
        
        self.generator.eval()
        self.discriminator.eval()
