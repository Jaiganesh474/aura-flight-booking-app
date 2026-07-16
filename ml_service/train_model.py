import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import pickle
import random

def generate_mock_data(n=1000):
    data = []
    for _ in range(n):
        hour_of_day = random.randint(0, 23)
        base_fare = random.uniform(3000, 15000)
        duration_minutes = random.randint(60, 300)
        
        # Simulate some logic: morning flights and cheaper flights are more likely to be booked
        score = 0
        if 6 <= hour_of_day <= 10:
            score += 2
        if base_fare < 6000:
            score += 3
        if duration_minutes < 120:
            score += 1
            
        prob = score / 6.0
        booked = 1 if random.random() < prob else 0
        
        data.append({
            'hour_of_day': hour_of_day,
            'base_fare': base_fare,
            'duration_minutes': duration_minutes,
            'booked': booked
        })
        
    return pd.DataFrame(data)

def train_and_save():
    df = generate_mock_data()
    X = df[['hour_of_day', 'base_fare', 'duration_minutes']]
    y = df['booked']
    
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X, y)
    
    with open('rf_model.pkl', 'wb') as f:
        pickle.dump(clf, f)
        
    print("Model trained and saved to rf_model.pkl")

if __name__ == "__main__":
    train_and_save()
