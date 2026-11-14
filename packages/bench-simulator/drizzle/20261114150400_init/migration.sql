CREATE TABLE `measurements` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`startedAt` integer NOT NULL,
	`dataset` text NOT NULL,
	`algorithm` text NOT NULL,
	`multiplier` integer NOT NULL,
	`nodes` integer NOT NULL,
	`run` integer NOT NULL,
	`time` real NOT NULL,
	`msgCount` integer NOT NULL
);
