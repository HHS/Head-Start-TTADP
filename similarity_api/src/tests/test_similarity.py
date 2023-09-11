import pytest
import numpy as np

from flask import Flask
from unittest.mock import patch, MagicMock
from sim.compute import compute_goal_similarities, find_similar_goals, calculate_string_similarity

app = Flask(__name__)

def test_string_similarity():
    """
    Test the 'calculate_string_similarity' function.
    """

    with app.app_context():
        # Mock input strings
        string1 = "hello"
        string2 = "world"

        # Mock the 'calculate_string_similarity' function
        with patch('sim.compute.calculate_string_similarity'):
            # Call the function under test
            result = calculate_string_similarity(string1, string2)

            # Log the result
            print(result)

            # Assertions
            assert result.status_code == 200
            assert result.data == b'{"similarity":0.5070884823799133}\n'

if __name__ == "__main__":
    # Run the tests
    pytest.main()
