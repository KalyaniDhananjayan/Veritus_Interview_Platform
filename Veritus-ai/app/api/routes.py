from fastapi import APIRouter
from pydantic import BaseModel
from app.rag.pipeline import evaluate_pipeline

router = APIRouter()


class EvaluationRequest(BaseModel):
    question: str
    answer: str
    testType: str
    difficulty: str


@router.post("/evaluate")
def evaluate(data: EvaluationRequest):

    # ✅ Check empty question
    if not data.question or not data.question.strip():
        return {
            "score": 0,
            "feedback": "Question cannot be empty."
        }

    # ✅ Check empty answer
    if not data.answer or not data.answer.strip():
        return {
            "score": 0,
            "feedback": "Answer cannot be empty."
        }

    return evaluate_pipeline(
        data.question,
        data.answer,
        data.testType,
        data.difficulty
    )