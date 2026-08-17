from typing import Dict, Any


def calculate_baseline_readiness(percentage_score: float, domain_scores: Dict[str, float]) -> Dict[str, Any]:
    """
    Utility helper for calculating initial readiness tier and cognitive affinity.
    """
    return {
        "readiness_score": percentage_score,
        "is_ready": percentage_score >= 50.0,
        "domain_breakdown": domain_scores
    }
