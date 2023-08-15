import numpy as np
import spacy
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize
from flask import jsonify
from typing import List, Dict
from db.db import query_many

nlp = spacy.load("en_core_web_sm")

def compute_goal_similarities(recipient_id, alpha):
  recipients = query_many(
    """
    SELECT g."id", g."name"
    FROM "Goals" g
    JOIN "Grants" gr ON g."grantId" = gr."id"
    JOIN "Recipients" r ON gr."recipientId" = r."id"
    WHERE r."id" = :recipient_id AND g."name" IS NOT NULL;
    """,
    { 'recipient_id': recipient_id }
  )

  if recipients is None:
    return jsonify({"error": "recipient_id not found"}), 400

  names = [r['name'] for r in recipients]
  ids = [r['id'] for r in recipients]
  matched = calculate_goal_similarity(names, ids, alpha)
  return jsonify({"result": matched})

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


def calculate_goal_similarity(goals_list: List[str], goal_ids_list: List[int], alpha: float, batch_size: int = 500) -> List[Dict[str, str]]:
    """
    Calculates the similarity between a list of goals.
    Args:
        goals_list (list): A list of goals.
        goal_ids_list (list): A list of goal IDs.
        batch_size (int, optional): The batch size to use for calculating similarity. Defaults to 500.
    Returns:
        list: A list of matched goals.
    """
    num_goals = len(goals_list)
    matched_goals = []

    for i in range(0, num_goals, batch_size):
        end = min(i + batch_size, num_goals)
        current_batch = goals_list[i:end]
        current_ids = goal_ids_list[i:end]

        batch_sim_scores = calculate_batch_similarity(current_batch, nlp)

        for j, (goal, goal_id) in enumerate(zip(current_batch, current_ids)):
            cur_sim_scores = batch_sim_scores[j]
            cur_sim_scores[j] = 0
            cur_potential_idx = [k for k, v in enumerate(cur_sim_scores) if v > alpha]

            for k in cur_potential_idx:
                if i + j > i + k:
                    continue
                matched_goals.append({
                    "goal1": {
                        "id": goal_id,
                        "name": goal,
                    },
                    "goal2": {
                        "id": current_ids[k],
                        "name": current_batch[k],
                    },
                    "similarity": float(cur_sim_scores[k]),
                })

    return matched_goals

def find_similar_goals(recipient_id, goal_name, alpha):
    # Fetch goals for the given recipient_id
    recipients = query_many(
        """
        SELECT g."id", g."name"
        FROM "Goals" g
        JOIN "Grants" gr ON g."grantId" = gr."id"
        JOIN "Recipients" r ON gr."recipientId" = r."id"
        WHERE r."id" = :recipient_id AND g."name" IS NOT NULL;
        """,
        {'recipient_id': recipient_id}
    )

    if recipients is None:
        return {"error": "recipient_id not found"}

    # Fetch the embeddings for all the goals including the given goal_name
    goal_embeddings = [nlp(goal['name']).vector for goal in recipients]
    target_embedding = nlp(goal_name).vector.reshape(1, -1)

    # Calculate cosine similarity between the target goal and all other goals
    goal_embeddings_normalized = normalize(goal_embeddings)
    target_embedding_normalized = normalize(target_embedding)
    sim_scores = cosine_similarity(target_embedding_normalized, goal_embeddings_normalized)[0]

    # Filter out the goals which have similarity score above alpha
    similar_goals = [
        {
            "goal": {
                "id": recipients[i]['id'],
                "name": recipients[i]['name'],
            },
            "similarity": sim_scores[i]
        }
        # for i, score in enumerate(sim_scores) if score > alpha and recipients[i]['name'] != goal_name
        for i, score in enumerate(sim_scores) if score > alpha
    ]

    return {"result": similar_goals}

def calculate_string_similarity(string1, string2):
    # Calculate embeddings for the two strings
    embedding1 = nlp(string1).vector.reshape(1, -1)
    embedding2 = nlp(string2).vector.reshape(1, -1)

    # Normalize the embeddings
    embedding1_normalized = normalize(embedding1)
    embedding2_normalized = normalize(embedding2)

    # Calculate cosine similarity between the two embeddings
    sim_score = cosine_similarity(embedding1_normalized, embedding2_normalized)[0][0]

    return jsonify({"similarity": float(sim_score)})

