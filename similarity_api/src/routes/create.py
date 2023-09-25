from flask import Flask, jsonify, request, send_from_directory
from routes.middleware import api_key_header
from sim.compute import compute_goal_similarities, find_similar_goals, calculate_string_similarity

def create_routes(app: Flask):

  @app.route('/openapi.json')
  def serve_openapi():
      return send_from_directory(str(app.static_folder), 'openapi.json')

  @app.route('/compute', methods=['POST'])
  @api_key_header
  def compute():
      data = request.get_json()

      alpha = data["alpha"] if "alpha" in data else 0.9

      if "text" in data and "recipient_id" in data:
          recipient_id = data["recipient_id"]
          text = data["text"]
          return find_similar_goals(recipient_id, text, alpha)
      elif "text_1" and "text_2" in data:
          text_1 = data["text_1"]
          text_2 = data["text_2"]
          return calculate_string_similarity(text_1, text_2)
      elif "recipient_id" in data:
          recipient_id = data["recipient_id"]
          return compute_goal_similarities(recipient_id, alpha)
      else:
          return jsonify({"error": "recipient_id not provided"}), 400


