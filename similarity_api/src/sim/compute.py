import logging
from datetime import datetime
from typing import (
    Dict,
    List,
)

import numpy as np
import spacy
from flask import jsonify
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize

from db.db import (
    query,
    query_many,
)

nlp = spacy.load("en_core_web_sm")

def compute_goal_similarities(recipient_id: int, alpha: float, cluster: bool):
  # NOTE: in the query bellow there are two sections filtering out goals that are created via activity reports, but the report has not yet been approved.
  # These section should be removed once we add support to the backend to allow merging these type of goals while maintaining the associated metadata correctly.
  recipients = query_many(
    """
    SELECT g."id", g."name", gr."id" AS "grantId"
    FROM "Goals" g
    JOIN "Grants" gr
      ON g."grantId" = gr."id"
    JOIN "Recipients" r
      ON gr."recipientId" = r."id"
    -- -------------------------------------------
    -- Only needed to prevent goals created from non-approved reports from being merged
    LEFT JOIN "ActivityReportGoals" arg
      ON g.id = arg."goalId"
    LEFT JOIN "ActivityReports" ar
      ON arg."activityReportId" = ar.id
    -- -------------------------------------------
    WHERE r."id" = :recipient_id
      AND NULLIF(TRIM(g."name"), '') IS NOT NULL
    -- -------------------------------------------
    -- Only needed to prevent goals created from non-approved reports from being merged
      AND ((ar."approvedAt" IS NOT NULL
        AND g."createdVia"::text = 'activityReport')
        OR (g."createdVia"::text != 'activityReport')
      )
    -- -------------------------------------------
    ;
    """,
    { 'recipient_id': recipient_id }
  )

  if recipients is None:
    return jsonify({"error": "recipient_id not found"}), 400

  names = [r['name'] for r in recipients]
  ids = [r['id'] for r in recipients]
  grants = [r['grantId'] for r in recipients]
  matched = calculate_goal_similarity(names, ids, grants, alpha, cluster)
  return jsonify({"result": matched})

def cache_scores():
  recipients = query_many(
    """
    SELECT g."id", g."name"
    FROM "Goals" g
    JOIN "Grants" gr
      ON g."grantId" = gr."id"
    JOIN "Recipients" r
      ON gr."recipientId" = r."id"
    WHERE NULLIF(TRIM(g."name"), '') IS NOT NULL;
    """,
    {}
  )

  if recipients is None:
    return jsonify({"error": "recipient_id not found"}), 400

  for i in range(len(recipients)):
    names = [r['name'] for r in recipients[i:]]
    ids = [r['id'] for r in recipients[i:]]
    matched = calculate_goal_similarity(names, ids, 0.0)

    if len(matched) > 0:
      for match in matched:
        goal1 = match['goal1']['id']
        goal2 = match['goal2']['id']
        score = match['similarity']
        insert_score(goal1, goal2, score, recipients[i]['id'])

  return jsonify({"result": "Scores inserted into database"})

def insert_score(goal1, goal2, score, recipient_id):
  """
  Inserts the similarity score into the SimScoreGoalCaches table.
  """
  query(
    """
    INSERT INTO "SimScoreGoalCaches" (recipient_id, goal1, goal2, score, "createdAt", "updatedAt")
    SELECT :recipient_id, :goal1, :goal2, :score, :createdAt, :updatedAt
    WHERE NOT EXISTS (
      SELECT 1 FROM "SimScoreGoalCaches"
      WHERE recipient_id = :recipient_id
        AND goal1 = :goal1
        AND goal2 = :goal2
    );
    """,
    { 'recipient_id': recipient_id, 'goal1': goal1, 'goal2': goal2, 'score': score, 'createdAt': datetime.now().isoformat(), 'updatedAt': datetime.now().isoformat() }
  )

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


def calculate_goal_similarity(goals_list: List[str], goal_ids_list: List[int], grants_list: List[int], alpha: float, cluster: bool = False, batch_size: int = 500) -> List[Dict[str, str]]:
    num_goals = len(goals_list)
    matched_goals = []
    matched_ids = []

    for i in range(0, num_goals, batch_size):
        end = min(i + batch_size, num_goals)
        current_batch = goals_list[i:end]
        current_ids = goal_ids_list[i:end]
        current_grants = grants_list[i:end]

        batch_sim_scores = calculate_batch_similarity(current_batch, nlp)

        for j, (goal, goal_id, grant_id) in enumerate(zip(current_batch, current_ids, current_grants)):
            cur_sim_scores = batch_sim_scores[j]
            cur_sim_scores[j] = 0
            cur_potential_idx = [k for k, v in enumerate(cur_sim_scores) if v > alpha]

            if cluster:
                matches = []
                for k in cur_potential_idx:
                    if i + j > i + k or current_ids[k] in matched_ids:
                        continue
                    matches.append({
                        "id": current_ids[k],
                        "name": current_batch[k],
                        "grantId": current_grants[k],
                        "similarity": float(cur_sim_scores[k]),
                    })
                    matched_ids.append(current_ids[k])
                if matches:
                    matched_goals.append({
                        "id": goal_id,
                        "name": current_batch[j],
                        "matches": matches
                    })
            else:
                for k in cur_potential_idx:
                    if i + j > i + k or current_ids[k] in matched_ids:
                        continue
                    matched_goals.append({
                        "goal1": {
                            "id": goal_id,
                            "name": goal,
                            "grantId": grant_id,
                        },
                        "goal2": {
                            "id": current_ids[k],
                            "name": current_batch[k],
                            "grantId": grant_id,
                        },
                        "similarity": float(cur_sim_scores[k]),
                    })
                    matched_ids.append(current_ids[k])

    return matched_goals

def find_similar_goals(recipient_id, goal_name, alpha, include_curated_templates = False):
    # Fetch goals for the given recipient_id
    recipients = query_many(
        """
        SELECT g."id", g."name", gr."id" AS "grantId", FALSE as is_template
        FROM "Goals" g
        JOIN "Grants" gr
          ON g."grantId" = gr."id"
        JOIN "Recipients" r
          ON gr."recipientId" = r."id"
        WHERE r."id" = :recipient_id
          AND NULLIF(TRIM(g."name"), '') IS NOT NULL;
        """,
        {'recipient_id': recipient_id}
    )    

    if recipients is None:
        return {"error": "recipient_id not found"}

    if include_curated_templates:
        curated_templates = query_many(
            """
            SELECT 
              g."id", 
              g."templateName" as name, 
              NULL AS "grantId", 
              TRUE as is_template,
              COALESCE(g."source", '') as source,
              '' as "endDate"
            FROM "GoalTemplates" g
            WHERE g."creationMethod" = 'Curated';
            """,
            {}
        )

        if curated_templates is not None:
            recipients.extend(curated_templates)   

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
                "grantId": recipients[i]['grantId'],
                "isTemplate": recipients[i]['is_template']
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

