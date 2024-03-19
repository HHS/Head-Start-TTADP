from flask import (
    Flask,
    jsonify,
    request,
    send_from_directory,
)

from routes.middleware import api_key_header
from sim.compute import (
    calculate_string_similarity,
    compute_goal_similarities,
    find_similar_goals,
)


def create_routes(app: Flask):

  @app.route('/openapi.json')
  def serve_openapi():
      return send_from_directory(str(app.static_folder), 'openapi.json')

  @app.route('/compute', methods=['POST'])
  @api_key_header
  def compute():
      data = request.get_json()

      alpha = data["alpha"] if "alpha" in data else 0.9
      cluster = data["cluster"] if "cluster" in data else False
      include_curated_templates = data["include_curated_templates"] if "include_curated_templates" in data else False

      regionId = data["regionId"] if "regionId" in data else None

      ## If region is not specified, then return error.
      if regionId is None:
            return jsonify({"error": "regionId not provided"}), 400

      if "text" in data and "recipient_id" in data:
          recipient_id = data["recipient_id"]
          text = data["text"]
          return find_similar_goals(recipient_id, text, alpha, regionId, include_curated_templates)
      elif "text_1" in data and "text_2" in data:
          text_1 = data["text_1"]
          text_2 = data["text_2"]
          return calculate_string_similarity(text_1, text_2)
      elif "recipient_id" in data:
          recipient_id = data["recipient_id"]
          return compute_goal_similarities(recipient_id, alpha, cluster, regionId)
      else:
          return jsonify({"error": "recipient_id not provided"}), 400
