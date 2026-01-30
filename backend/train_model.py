import csv
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import make_pipeline
from sklearn.naive_bayes import MultinomialNB

def train():
  texts = []
  labels = []

  try:
      with open('disease_data.csv', 'r', encoding='utf-8') as f:
          reader = csv.DictReader(f)
          for row in reader:
              if row['text'] and row['label']:
                  texts.append(row['text'])
                  labels.append(row['label'])
  except FileNotFoundError:
      print("Error: disease_data.csv not found!")
      return

  if not texts:
      print("Error: Dataset is empty.")
      return

  model = make_pipeline(TfidfVectorizer(), MultinomialNB())
  
  print(f"Training on {len(texts)} samples...")
  model.fit(texts, labels)

  with open('disease_model.pkl', 'wb') as f:
      pickle.dump(model, f)
  
  print("Success! Model saved as 'disease_model.pkl'")

if __name__ == "__main__":
  train()