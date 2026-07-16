from flask import Flask, request, jsonify
import pickle
import pandas as pd
import os
from datetime import datetime

app = Flask(__name__)

# Load model if exists
MODEL_PATH = 'rf_model.pkl'
if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
else:
    model = None
    print(f"Warning: {MODEL_PATH} not found. Run train_model.py first.")

@app.route('/rank_flights', methods=['POST'])
def rank_flights():
    if model is None:
        return jsonify({"error": "Model not trained"}), 500
        
    data = request.json
    flights = data.get('flights', [])
    
    if not flights:
        return jsonify({"ranked_flights": []})
        
    # Extract features for each flight
    features = []
    for f in flights:
        # Example extracting hour from departureTime (expected format: "2026-07-16T08:30:00")
        try:
            dep_time = datetime.fromisoformat(f.get('departureTime', '2026-01-01T12:00:00'))
            hour_of_day = dep_time.hour
        except Exception:
            hour_of_day = 12
            
        base_fare = f.get('baseFare', 5000.0)
        duration_minutes = f.get('durationMinutes', 120)
        
        features.append({
            'hour_of_day': hour_of_day,
            'base_fare': float(base_fare),
            'duration_minutes': int(duration_minutes)
        })
        
    df = pd.DataFrame(features)
    
    # Predict probabilities (probability of class 1 which is 'booked')
    probs = model.predict_proba(df)[:, 1]
    
    # Attach score to flights
    for i in range(len(flights)):
        flights[i]['mlScore'] = float(probs[i])
        
    # Sort descending by score
    flights.sort(key=lambda x: x['mlScore'], reverse=True)
    
    return jsonify({"ranked_flights": flights})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
