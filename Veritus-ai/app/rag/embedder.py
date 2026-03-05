import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# -------- PATHS --------

BASE_DIR = os.path.dirname(__file__)

KNOWLEDGE_PATH = os.path.abspath(
    os.path.join(BASE_DIR, "../knowledge_base")
)

FAISS_SAVE_PATH = os.path.abspath(
    os.path.join(BASE_DIR, "../faiss/faiss.index")
)

# -------- LOAD MODEL --------

print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

# -------- LOAD TEXT FILES --------

def load_documents():
    docs = []

    for root, dirs, files in os.walk(KNOWLEDGE_PATH):
        for file in files:
            if file.endswith(".txt"):
                filepath = os.path.join(root, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    docs.append(f.read())

    return docs

# -------- BUILD INDEX --------

def build_index():

    docs = load_documents()

    if len(docs) == 0:
        print("No knowledge files found.")
        return

    print("Generating embeddings...")

    embeddings = model.encode(docs)

    embeddings = np.array(embeddings).astype("float32")

    dimension = embeddings.shape[1]

    index = faiss.IndexFlatL2(dimension)

    index.add(embeddings)

    print("Saving FAISS index...")

    faiss.write_index(index, FAISS_SAVE_PATH)

    print("FAISS index created successfully!")


if __name__ == "__main__":
    build_index()