CREATE DATABASE IF NOT EXISTS fit_wit_ai;
USE fit_wit_ai;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    age INT,
    gender VARCHAR(20),
    height FLOAT,
    weight FLOAT,
    medical_conditions TEXT,
    fitness_goals TEXT,
    dietary_preferences TEXT,
    is_onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Progress table
CREATE TABLE IF NOT EXISTS user_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    date DATE,
    weight FLOAT,
    calories_burned INT,
    steps INT,
    active_minutes INT,
    water_intake FLOAT,
    sleep_hours FLOAT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    workout_date DATE,
    workout_type VARCHAR(50),
    duration INT,
    calories_burned INT,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Nutrition table
CREATE TABLE IF NOT EXISTS nutrition_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    log_date DATE,
    meal_type VARCHAR(50),
    food_items TEXT,
    calories INT,
    protein FLOAT,
    carbs FLOAT,
    fats FLOAT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Health Metrics table
CREATE TABLE IF NOT EXISTS health_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    record_date DATE,
    heart_rate INT,
    blood_pressure VARCHAR(20),
    blood_sugar FLOAT,
    body_fat_percentage FLOAT,
    bmi FLOAT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create user_details table
CREATE TABLE IF NOT EXISTS user_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    age INT,
    gender VARCHAR(20),
    height FLOAT,
    weight FLOAT,
    fitness_goals TEXT,
    medical_conditions TEXT,
    activity_level VARCHAR(50),
    dietary_preferences TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
); 