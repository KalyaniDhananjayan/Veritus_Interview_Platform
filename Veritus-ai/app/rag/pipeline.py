from app.rag.retriever import search_answer
from app.rag.llm_engine import evaluate_with_llm

def evaluate_pipeline(question, answer, testType, difficulty):

    # Step 1: Retrieve knowledge context
    _, context = search_answer(answer)

    # Step 2: Send to LLM evaluator
    llm_result = evaluate_with_llm(
        question,
        answer,
        context,
        testType,
        difficulty
    )

    return llm_result