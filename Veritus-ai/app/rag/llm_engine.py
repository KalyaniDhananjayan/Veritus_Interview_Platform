import requests
import json

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "phi3"


def evaluate_with_llm(question, answer, context, testType, difficulty):

    prompt = f"""
You are a technical interviewer AI.

Question:
{question}

Candidate Answer:
{answer}

Reference Knowledge:
{context}

Evaluate the candidate answer.

Return ONLY JSON:

{{
 "score": number between 0 and 10,
 "feedback": "short explanation"
}}
"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False
            }
        )

        result = response.json()

        output_text = result["response"]

        # Basic JSON extraction
        start = output_text.find("{")
        end = output_text.rfind("}") + 1

        json_text = output_text[start:end]

        return json.loads(json_text)

    except Exception:
        return {
            "score": 5,
            "feedback": "LLM response parsing failed."
        }