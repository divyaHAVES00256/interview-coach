# backend/app/services/question_bank.py
"""
Static question bank — Phase 5 placeholder.
Phase 6 will replace get_questions_for_session() with a LangChain + FAISS
RAG pipelin
"""

from typing import TypedDict


class QuestionDict(TypedDict):
    text: str
    type: str        # "technical" | "behavioral" | "system_design" | "coding"
    difficulty: str  # "easy" | "medium" | "hard"


_BANK: dict[str, list[QuestionDict]] = {

    "backend": [
        {
            "text": "Explain the difference between REST and GraphQL. "
                    "When would you choose one over the other?",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "What is database indexing? How does it speed up queries, "
                    "and what are the trade-offs of adding many indexes?",
            "type": "technical",
            "difficulty": "easy",
        },
        {
            "text": "Describe how you would design a rate-limiter for a public API "
                    "that needs to support 10,000 requests per second.",
            "type": "technical",
            "difficulty": "hard",
        },
        {
            "text": "What is the N+1 query problem in ORMs like SQLAlchemy? "
                    "How do you detect and fix it?",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "Explain ACID properties in databases. Give a real-world "
                    "example where violating one property causes a bug.",
            "type": "technical",
            "difficulty": "easy",
        },
    ],

    "frontend": [
        {
            "text": "What is the Virtual DOM in React? Why was it introduced, "
                    "and what problem does it solve?",
            "type": "technical",
            "difficulty": "easy",
        },
        {
            "text": "Explain React's useEffect hook. What are the most common "
                    "mistakes developers make with the dependency array?",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "What is CSS specificity? Walk me through how a browser "
                    "resolves conflicting style rules.",
            "type": "technical",
            "difficulty": "easy",
        },
        {
            "text": "What is the Critical Rendering Path? How would you "
                    "optimize a webpage that scores poorly on First Contentful Paint?",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "Explain React's reconciliation algorithm. How does React "
                    "decide what to re-render when state changes?",
            "type": "technical",
            "difficulty": "hard",
        },
    ],

    "ml": [
        {
            "text": "What is overfitting? Describe three techniques to prevent it "
                    "and explain the intuition behind each.",
            "type": "technical",
            "difficulty": "easy",
        },
        {
            "text": "Explain the bias-variance tradeoff. How does it relate "
                    "to model complexity?",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "Walk me through backpropagation in a neural network. "
                    "What is a vanishing gradient and why does it happen?",
            "type": "technical",
            "difficulty": "medium",
        },
        {
            "text": "What is gradient descent? How does the learning rate "
                    "affect convergence, and what happens if it's too high or too low?",
            "type": "technical",
            "difficulty": "easy",
        },
        {
            "text": "Explain the attention mechanism in transformers. "
                    "Why did it replace recurrent architectures like LSTMs?",
            "type": "technical",
            "difficulty": "hard",
        },
    ],

    "system_design": [
        {
            "text": "Design a URL shortener like bit.ly. Walk me through "
                    "your data model, API design, and how you'd handle high read traffic.",
            "type": "system_design",
            "difficulty": "medium",
        },
        {
            "text": "How would you design a real-time notification system "
                    "for an app with 5 million users?",
            "type": "system_design",
            "difficulty": "medium",
        },
        {
            "text": "Design a distributed cache like Redis. How does it handle "
                    "cache invalidation and eviction?",
            "type": "system_design",
            "difficulty": "hard",
        },
        {
            "text": "How would you scale a PostgreSQL database that has "
                    "outgrown a single server?",
            "type": "system_design",
            "difficulty": "hard",
        },
        {
            "text": "Design a simple file storage system like Google Drive. "
                    "Focus on the upload/download flow and metadata storage.",
            "type": "system_design",
            "difficulty": "easy",
        },
    ],

    "dsa": [
        {
            "text": "Explain Big-O notation. What is the time and space complexity "
                    "of a binary search, and why?",
            "type": "coding",
            "difficulty": "easy",
        },
        {
            "text": "What is dynamic programming? Explain the concept using "
                    "the coin-change problem as an example.",
            "type": "coding",
            "difficulty": "medium",
        },
        {
            "text": "How does a hash table work internally? Explain collision "
                    "resolution strategies and worst-case performance.",
            "type": "coding",
            "difficulty": "medium",
        },
        {
            "text": "Compare BFS and DFS graph traversal. When would you choose "
                    "one over the other? Give a use case for each.",
            "type": "coding",
            "difficulty": "easy",
        },
        {
            "text": "What is a balanced BST? Why does balance matter for "
                    "performance, and how does an AVL tree maintain it?",
            "type": "coding",
            "difficulty": "hard",
        },
    ],

    "behavioral": [
        {
            "text": "Tell me about a time you faced a difficult technical problem "
                    "during a project. How did you approach and solve it?",
            "type": "behavioral",
            "difficulty": "medium",
        },
        {
            "text": "Describe a situation where you had to learn a new technology "
                    "or concept quickly under a deadline.",
            "type": "behavioral",
            "difficulty": "easy",
        },
        {
            "text": "Tell me about a time you disagreed with a teammate on a "
                    "technical decision. How did you resolve it?",
            "type": "behavioral",
            "difficulty": "medium",
        },
        {
            "text": "What is the project you're most proud of? What was your "
                    "specific contribution and what would you do differently?",
            "type": "behavioral",
            "difficulty": "easy",
        },
        {
            "text": "Describe a time you had to explain a complex technical concept "
                    "to a non-technical person. What approach did you take?",
            "type": "behavioral",
            "difficulty": "hard",
        },
    ],
}

_DIFFICULTY_ORDER = ["easy", "medium", "hard"]


def get_questions_for_session(
    domain: str,
    difficulty: str,
    count: int = 5,
) -> list[QuestionDict]:
    """
    Return up to `count` questions for the given domain and difficulty.
    """
    domain = domain.lower().strip()
    difficulty = difficulty.lower().strip()

    # Graceful fallback if domain doesn't exist
    if domain not in _BANK:
        domain = "behavioral"

    all_questions = _BANK[domain]

    # Separate into matching and non-matching difficulties
    matching = [q for q in all_questions if q["difficulty"] == difficulty]
    others = [q for q in all_questions if q["difficulty"] != difficulty]

    # Fill up to `count`: matching first, then others as padding
    selected = matching[:count]
    if len(selected) < count:
        selected += others[: count - len(selected)]

    return selected