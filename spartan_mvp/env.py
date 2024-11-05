import gym
import numpy as np
from gym import spaces
from .kalman_filter import KalmanFilter

class SpartanEnv(gym.Env):
    def __init__(self):
        super(SpartanEnv, self).__init__()
        self.action_space = spaces.Discrete(3)  # Example: 0 = maintain, 1 = move closer, 2 = move away
        self.observation_space = spaces.Box(low=-np.inf, high=np.inf, shape=(3,), dtype=np.float32)

        # Set initial positions
        self.state = np.array([39.8138, -84.0500, 0.0])  # UAV position (lat, lng, alt)
        self.target_position = self._generate_random_target_position()
        self.kalman_filter = KalmanFilter()  # Kalman filter for sensor fusion

    def _generate_random_target_position(self):
        # Generate a random target position within a small area around Wright-Patterson AFB
        return np.array([
            39.8138 + np.random.normal(0, 0.005),  # Latitude
            -84.0500 + np.random.normal(0, 0.005), # Longitude
            np.random.uniform(0, 100)  # Altitude, assuming up to 100 meters
        ])

    def simulate_sensor_data(self):
        # Simulate noisy sensor readings
        radar_data = self.target_position + np.random.normal(0, 0.1, size=self.target_position.shape)
        visual_data = self.target_position + np.random.normal(0, 0.05, size=self.target_position.shape)
        infrared_data = self.target_position + np.random.normal(0, 0.07, size=self.target_position.shape)
        return radar_data, visual_data, infrared_data

    def fuse_sensor_data(self, radar_data, visual_data, infrared_data):
        # Simple fusion: use Kalman filter to process and combine data from multiple sensors
        radar_est = self.kalman_filter.update(radar_data)
        visual_est = self.kalman_filter.update(visual_data)
        infrared_est = self.kalman_filter.update(infrared_data)
        fused_data = (radar_est + visual_est + infrared_est) / 3
        return fused_data

    def reset(self):
        self.state = np.array([39.8138, -84.0500, 0.0])  # Reset UAV to initial position
        self.target_position = self._generate_random_target_position()  # New random target position
        return self.state

    def step(self, action):
        # Simulate target movement with noise
        self.target_position += np.random.normal(0, 0.0005, size=self.target_position.shape)
        
        # Simulate data from three sensors
        radar_data, visual_data, infrared_data = self.simulate_sensor_data()
        
        # Fuse sensor data using Kalman filter
        fused_data = self.fuse_sensor_data(radar_data, visual_data, infrared_data)
        
        # Update UAV state based on action (0 = maintain, 1 = move closer, 2 = move away)
        move_step = (action - 1) * 0.0001  # Small adjustment for lat/lng
        self.state[:2] += move_step * (self.target_position[:2] - self.state[:2]) / np.linalg.norm(self.target_position[:2] - self.state[:2] + 1e-6)
        
        # Calculate distance to target
        distance_to_target = np.linalg.norm(self.state - self.target_position)
        
        # Reward structure
        if distance_to_target < 0.1:
            reward = 20  # Large positive reward for reaching the target
            done = True  # End the episode
        else:
            reward = -distance_to_target  # Negative reward proportional to distance
            done = False  # Episode continues
        
        # Additional data for logging
        info = {
            "radar_data": radar_data.tolist(),
            "visual_data": visual_data.tolist(),
            "infrared_data": infrared_data.tolist(),
            "fused_data": fused_data.tolist()
        }
        
        return fused_data, reward, done, info
