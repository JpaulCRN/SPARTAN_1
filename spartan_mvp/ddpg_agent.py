# ddpg_agent.py
import numpy as np

class DDPGAgent:
    def __init__(self, state_size, action_size, target_position):
        self.state_size = state_size
        self.action_size = action_size
        self.target_position = target_position
        self.find_threshold = 1.0  # Distance threshold to start "fixing" or maintaining position

    def act(self, state):
        # Calculate distance to target
        distance_to_target = np.linalg.norm(self.target_position - state)
        
        if distance_to_target > self.find_threshold:
            # Move closer to the target
            action = 1
        elif distance_to_target < self.find_threshold - 0.1:
            # Move away from the target if too close
            action = 2
        else:
            # Maintain position
            action = 0
        
        return action  # Return an integer action (0, 1, or 2)

    def update_target_position(self, new_target_position):
        # Method to update target position dynamically if it's moving
        self.target_position = new_target_position

