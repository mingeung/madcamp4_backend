-- Active: 1706094639563@@127.0.0.1@3306
DROP DATABASE madcamp4;
CREATE DATABASE madcamp4;
Use madcamp4;
CREATE TABLE users(user_id VARCHAR(50), email VARCHAR(50) UNIQUE, nickname VARCHAR(50), password VARCHAR(50), profile_url VARCHAR(2048), PRIMARY KEY(user_id));
CREATE TABLE rooms(chatroom_id VARCHAR(50), locationroom_id VARCHAR(50) UNIQUE, roomname VARCHAR(50), members_num INT, last_message VARCHAR(50), last_time TIMESTAMP, PRIMARY KEY(chatroom_id));
CREATE TABLE chatjoins(chatroom_id VARCHAR(50), user_id VARCHAR(50), checked INT, PRIMARY KEY(chatroom_id,user_id), FOREIGN KEY(chatroom_id) REFERENCES rooms(chatroom_id) ON UPDATE CASCADE ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE);
CREATE TABLE locationjoins(locationroom_id VARCHAR(50), user_id VARCHAR(50), PRIMARY KEY(locationroom_id,user_id), FOREIGN KEY(locationroom_id) REFERENCES rooms(locationroom_id) ON UPDATE CASCADE ON DELETE CASCADE, FOREIGN KEY(user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE);
CREATE TABLE chats(chat_id INT AUTO_INCREMENT, chatroom_id VARCHAR(50), sender_id VARCHAR(50), contents VARCHAR(2048), category VARCHAR(20), send_time TIMESTAMP, PRIMARY KEY(chat_id), FOREIGN KEY(chatroom_id) REFERENCES rooms(chatroom_id) ON UPDATE CASCADE ON DELETE CASCADE, FOREIGN KEY(sender_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE);