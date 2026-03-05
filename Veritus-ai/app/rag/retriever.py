# app/rag/retriever.py

import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# ---------- PATH SETUP ----------

BASE_DIR = os.path.dirname(__file__)

FAISS_PATH = os.path.abspath(
    os.path.join(BASE_DIR, "../faiss/faiss.index")
)

KNOWLEDGE_PATH = os.path.abspath(
    os.path.join(BASE_DIR, "../knowledge_base")
)

# ---------- LOAD MODEL (LOAD ONCE) ----------

print("Loading embedding model...")
model = SentenceTransformer("all-MiniLM-L6-v2")

# ---------- LOAD FAISS INDEX (LOAD ONCE) ----------

print("Loading FAISS index...")
index = faiss.read_index(FAISS_PATH)

# ---------- LOAD KNOWLEDGE CHUNKS (LOAD ONCE) ----------

def load_chunks():
    chunks = []

    for root, dirs, files in os.walk(KNOWLEDGE_PATH):
        for file in files:
            if file.endswith(".txt"):
                filepath = os.path.join(root, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    chunks.append(f.read())

    return chunks

# Load once during startup
knowledge_chunks = load_chunks()

print(f"Loaded {len(knowledge_chunks)} knowledge chunks.")

# ---------- RETRIEVAL FUNCTION ----------

def search_answer(query, k=3):
    """
    Takes user answer as query,
    retrieves top-k relevant knowledge chunks.
    """

    # Convert query to embedding
    query_vector = model.encode([query])
    query_vector = np.array(query_vector).astype("float32")

    # Search FAISS
    distances, indices = index.search(query_vector, k)

    # Build context
    context = ""

    for idx in indices[0]:
        if 0 <= idx < len(knowledge_chunks):
            context += knowledge_chunks[idx] + "\n\n"

    # ---------- OPTIONAL DEBUG (REMOVE LATER) ----------
    print("Query:", query)
    print("Retrieved indices:", indices)
    print("Retrieved context:\n", context)
    print("-" * 50)

    return indices, context