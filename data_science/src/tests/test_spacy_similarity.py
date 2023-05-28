import pytest
import numpy as np

from unittest.mock import patch, MagicMock
from data_science.spacy_similarity import calculate_batch_similarity, my_calc_similarity


def test_my_calc_similarity():
    recipient_id = "TestRecipient"
    list_of_goals = ["TestGoal1", "TestGoal2", "TestGoal3"]
    list_of_goal_ids = [1, 2, 3]
    batch_size = 2
    nlp_mock = MagicMock()
    nlp_mock.return_value.vector = np.array([1, 1, 1])  # return some dummy vector

    # Adjust the expected result according to the actual logic of your function
    expected_result = [
        {"goal1_id": 1, "goal1": "TestGoal1", "goal2_id": 2, "goal2": "TestGoal2"}
    ]
    actual_result = my_calc_similarity(
        recipient_id, list_of_goals, list_of_goal_ids, nlp_mock, batch_size
    )

    assert (
        actual_result == expected_result
    ), f"Expected {expected_result}, but got {actual_result}"


def test_my_calc_similarity_empty():
    recipient_id = "TestRecipient"
    list_of_goals = []
    list_of_goal_ids = []
    batch_size = 2
    nlp_mock = MagicMock()  # Provide a mock here too
    nlp_mock.return_value.vector = np.array([1, 1, 1])  # return some dummy vector

    expected_result = []
    actual_result = my_calc_similarity(
        recipient_id,
        list_of_goals,
        list_of_goal_ids,
        nlp_mock,
        batch_size,  # Provide the mock here
    )

    assert (
        actual_result == expected_result
    ), f"Expected {expected_result}, but got {actual_result}"
