import re
import requests
import json

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "phi3"


def evaluate_with_llm(question, answer, context, testType, difficulty):

    prompt = f"""You are a strict technical interviewer AI. Your ONLY output must be valid JSON.

Question: {question}

Candidate Answer: {answer}

Reference Knowledge:
{context}

Test Type: {testType}
Difficulty: {difficulty}

Score the candidate answer from 0 to 10 based on correctness, depth, and clarity.

Respond with ONLY this JSON and nothing else:
{{"score": <integer 0-10>, "feedback": "<one or two sentence evaluation>"}}"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False
            },
            timeout=60
        )

        result = response.json()
        output_text = result.get("response", "")

        # Try regex first — more robust than simple find/rfind
        json_match = re.search(r'\{[^{}]*"score"\s*:\s*\d+[^{}]*"feedback"\s*:\s*"[^"]*"[^{}]*\}', output_text, re.DOTALL)
        if not json_match:
            # Fallback to bracket search
            start = output_text.find("{")
            end = output_text.rfind("}") + 1
            json_text = output_text[start:end] if start != -1 else "{}"
        else:
            json_text = json_match.group(0)

        parsed = json.loads(json_text)

        # Validate and clamp score to 0-10
        score = parsed.get("score", 0)
        if not isinstance(score, (int, float)):
            score = 0
        score = max(0, min(10, float(score)))

        feedback = parsed.get("feedback", "No feedback provided.")
        if not feedback or not str(feedback).strip():
            feedback = "No feedback provided."

        return {
            "score": score,
            "feedback": str(feedback).strip()
        }

    except requests.exceptions.ConnectionError:
        # Re-raise so triggerAIEvaluation marks this as FAILED in the DB
        raise RuntimeError("Ollama is not running on localhost:11434. Please start Ollama and ensure the phi3 model is pulled.")

    except requests.exceptions.Timeout:
        raise RuntimeError("Ollama evaluation timed out after 60 seconds.")

    except Exception as e:
        raise RuntimeError(f"LLM evaluation error: {str(e)[:200]}")