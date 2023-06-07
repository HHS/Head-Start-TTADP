"""
This module provides functions for calculating similarity between sentences using spaCy and sklearn.
"""

import numpy as np
import spacy

from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize


nlp = spacy.load("en_core_web_sm")
ALPHA = 0.9


def calculate_batch_similarity(batch, nlp):
    """
    Calculates the cosine similarity between a batch of sentences.

    Args:
        batch (list): A list of sentences.
        nlp (spacy.Language): A spaCy language model.

    Returns:
        numpy.ndarray: A 2D array of cosine similarity scores.
    """
    sentence_embeddings = np.array([nlp(goal).vector for goal in batch])
    # Normalize the embeddings to improve calculation
    sentence_embeddings_norm = normalize(sentence_embeddings)
    # Calculate the cosine similarity
    sim_scores = sentence_embeddings_norm @ sentence_embeddings_norm.T
    return sim_scores


def my_calc_similarity(list_of_goals, list_of_goal_ids, batch_size=500):
    """
    Calculates the similarity between a list of goals.

    Args:
        list_of_goals (list): A list of goals.
        list_of_goal_ids (list): A list of goal IDs.
        batch_size (int, optional): The batch size to use for calculating similarity. Defaults to 500.

    Returns:
        list: A list of matched goals.
    """
    matched_goals = []
    num_goals = len(list_of_goals)

    for i in range(0, num_goals, batch_size):
        end = min(i + batch_size, num_goals)
        current_batch = list_of_goals[i:end]
        current_ids = list_of_goal_ids[i:end]

        batch_sim_scores = calculate_batch_similarity(current_batch, nlp)

        for j in range(len(current_batch)):
            cur_sim_scores = batch_sim_scores[j]
            cur_sim_scores[j] = 0
            cur_potential_idx = [k for k, v in enumerate(cur_sim_scores) if v > ALPHA]

            for k in cur_potential_idx:
                if i + j > i + k:
                    continue
                matched_goals.append(
                    {
                        "goal1_id": current_ids[j],
                        "goal1": list_of_goals[i + j],
                        "goal2_id": current_ids[k],
                        "goal2": list_of_goals[i + k],
                    }
                )
    return matched_goals
