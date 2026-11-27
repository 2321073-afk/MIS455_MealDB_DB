-- server.js also creates this table automatically
USE test;

CREATE TABLE IF NOT EXISTS meals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meal_id VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(60),
  area VARCHAR(60),
  image VARCHAR(255),
  search_term VARCHAR(100),
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Show your teacher the data saved from the website
SELECT * FROM meals;
