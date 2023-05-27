import pytest
import numpy as np

from unittest.mock import patch, MagicMock
from data_science.spacy_similarity import calculate_batch_similarity, my_calc_similarity

def test_calculate_batch_similarity():
    batch = ["This is a test", "This is another test"]
    
    with patch("data_science.spacy_similarity.nlp", return_value=MagicMock(vector=np.array([1, 1]))) as mock_nlp:
        result = calculate_batch_similarity(batch)
        assert result.shape == (2, 2)
        mock_nlp.assert_called()

@pytest.mark.parametrize(
    "user_id, list_of_goals, list_of_ids, expected_output",
    [
        (
            "test_user",
            ["This is a test", "This is another test"],
            ["id1", "id2"],
            [
                {
                    "goal1_id": 0,
                    "goal1": "This is a test",
                    "goal2_id": 1,
                    "goal2": "This is another test",
                }
            ],
        ),
        (
            "test_user",
            ["This is a test"],
            ["id1"],
            [],
        ),
    ],
)

def test_my_calc_similarity(user_id, list_of_goals, list_of_ids, expected_output):
    sim_matrix_size = len(list_of_goals)
    mock_sim_matrix = np.ones((sim_matrix_size, sim_matrix_size))
    
    with patch("data_science.spacy_similarity.calculate_batch_similarity", return_value=mock_sim_matrix):
        result = my_calc_similarity(user_id, list_of_goals, list_of_ids)
        assert result == expected_output
