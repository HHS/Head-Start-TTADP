from flask import Flask, jsonify, request, send_from_directory
from routes.middleware import api_key_header

def create_routes(app: Flask):

  @app.route('/openapi.json')
  def serve_openapi():
    return send_from_directory(app.static_folder, 'openapi.json')

  @app.route('/compute', methods=['POST'])
  @api_key_header
  def compute():
      data = request.get_json()

      alpha = data["alpha"] if "alpha" in data else 0.8

      if "text" in data and "recipient_id" in data:
          text = data["text"]
          result = f"Computation result for text: {text}"
          return jsonify({"result": result})
      elif "text_1" and "text_2" in data:
          text_1 = data["text_1"]
          text_2 = data["text_2"]
          result = f"Computation result for text_1: {text_1} and text_2: {text_2}"
          return jsonify({"result": result})
      elif "recipient_id" in data:
          recipient_id = data["recipient_id"]
          result = f"Computation result for recipient_id: {recipient_id}"
          return jsonify({"result": result})
      else:
          return jsonify({"error": "recipient_id not provided"}), 400


