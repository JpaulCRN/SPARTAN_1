from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import numpy as np

app = Flask(__name__, static_folder='frontend')
CORS(app)

# Initialize UAV and target positions
uav_position = np.array([39.8136, -84.0510, 0.0])  # UAV starting position (lat, lng, alt)
target_position = np.array([39.8193, -84.0450, 0.0])   # Target starting position (lat, lng, alt)

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/status', methods=['GET'])
def get_status():
    global uav_position, target_position

    # Simulate target movement by adding a small random offset
    target_position[:2] += np.random.normal(0, 0.0001, size=2)

    # Calculate direction vector for UAV to move closer to the target
    direction_vector = target_position[:2] - uav_position[:2]
    direction_vector /= (np.linalg.norm(direction_vector) + 1e-6)  # Normalize to unit vector

    # Move UAV a small step in the direction of the target
    uav_position[:2] += 0.0001 * direction_vector  # Adjust step size as needed

    # Calculate distance to target and set reward
    distance_to_target = np.linalg.norm(uav_position[:2] - target_position[:2])
    reward = 20 if distance_to_target < 0.0001 else -distance_to_target

    return jsonify({
        'state': uav_position.tolist(),
        'action': 1,  # Placeholder action for movement
        'reward': reward,
        'target_position': target_position.tolist(),
        'sensor_data': {}
    })

if __name__ == '__main__':
    app.run(debug=True)
