class KalmanFilter:
    def __init__(self, process_variance=1e-5, measurement_variance=0.1):
        self.process_variance = process_variance
        self.measurement_variance = measurement_variance
        self.estimate = 0.0
        self.error_estimate = 1.0

    def update(self, measurement):
        
        priori_estimate = self.estimate
        priori_error_estimate = self.error_estimate + self.process_variance
        blending_factor = priori_error_estimate / (priori_error_estimate + self.measurement_variance)
        self.estimate = priori_estimate + blending_factor * (measurement - priori_estimate)
        self.error_estimate = (1 - blending_factor) * priori_error_estimate
        return self.estimate
