import os
from functools import wraps

from flask import (
    jsonify,
    request,
)


# Decorator function to validate API key in request headers
def api_key_header(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        key = None

        # Check if "X-API-KEY" header is present in the request headers
        if "X-API-KEY" in request.headers:
            # Retrieve the API key from the request headers
            key = request.headers["X-API-KEY"]

            # Compare the retrieved key with the environment variable "SIMILARITY_API_KEY"
            if key != os.environ["SIMILARITY_API_KEY"]:
                # Return error response with status code 401 (Unauthorized)
                return jsonify({"error": "Invalid API key"}), 401

        # If no key is found in the headers, return error response with status code 401 (Unauthorized)
        if not key:
            return jsonify({"error": "API key is missing"}), 401

        # Call the original function with the provided arguments and return its result
        return f(*args, **kwargs)

    # Return the decorated function
    return decorated
