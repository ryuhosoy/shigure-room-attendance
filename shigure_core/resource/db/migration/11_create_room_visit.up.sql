CREATE TABLE IF NOT EXISTS `room_visit` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(128) NOT NULL,
  `visit_date` DATE NOT NULL,
  `entered_at` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_room_visit_user_date` (`user_id`, `visit_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
