CREATE DATABASE IF NOT EXISTS sanitation_system;
USE sanitation_system;

-- 1. Supervisors Table
CREATE TABLE IF NOT EXISTS supervisors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100),
    username VARCHAR(50) UNIQUE,
    password VARCHAR(255)
);

-- 2. Residents Table
CREATE TABLE IF NOT EXISTS residents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100),
    username VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    is_approved TINYINT(1) DEFAULT 0
);

-- 3. Workers Table
CREATE TABLE IF NOT EXISTS workers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100),
    username VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    performance_score INT DEFAULT 0,
    is_approved TINYINT(1) DEFAULT 0
);

-- 4. Requests Table
CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resident_id INT,
    assigned_worker_id INT,
    type VARCHAR(100),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    rating INT DEFAULT NULL,
    feedback TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT,
    description TEXT,    Server running on port 3000
    Connected to MySQL Database.  
    attachment VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Insert Default Admin (The Supervisor)
INSERT INTO supervisors (full_name, username, password) 
VALUES ('System Admin', 'super1', 'super123');

-- 7. Password Fix (Required for some local setups)
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '12345';
FLUSH PRIVILEGES;