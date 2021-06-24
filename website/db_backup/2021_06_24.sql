/*
SQLyog Ultimate v10.00 Beta1
MySQL - 5.5.5-10.1.32-MariaDB : Database - luxor
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`luxortest` /*!40100 DEFAULT CHARACTER SET utf8 */;

USE `luxortest`;

/*Table structure for table `cameras` */

DROP TABLE IF EXISTS `cameras`;

CREATE TABLE `cameras` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `camera_name` varchar(25) DEFAULT NULL COMMENT 'camera name',
  `camera_url` varchar(255) DEFAULT NULL COMMENT 'camera source url',
  `server_url` varchar(255) DEFAULT NULL COMMENT 'camera processing and storage video url',
  `state` int(11) DEFAULT '1' COMMENT 'turn on or off',
  `location` varchar(200) DEFAULT NULL COMMENT 'camera location',
  `user_id` int(11) unsigned DEFAULT NULL,
  `zone_id` int(5) DEFAULT '1' COMMENT 'zone id',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;

/*Data for the table `cameras` */

insert  into `cameras`(`id`,`camera_name`,`camera_url`,`server_url`,`state`,`location`,`user_id`,`zone_id`) values (1,'Oak-D','defualt','1',1,'a',1,1);

/*Table structure for table `menus` */

DROP TABLE IF EXISTS `menus`;

CREATE TABLE `menus` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `icon` varchar(50) NOT NULL,
  `url` varchar(255) DEFAULT NULL,
  `parent_id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8;

/*Data for the table `menus` */

insert  into `menus`(`id`,`name`,`icon`,`url`,`parent_id`) values (1,'Dashboard','fa fa-dashboard','/Manager/Index',0),(3,'Roles','fa fa-universal-access','/Roles/Index',0),(5,'User Management','fa fa-users','/User/Index',0),(6,'Camera','fa fa-camera','/Camera/Index',0),(7,'Videos','fa fa-video-camera','/Video/Index',0);

/*Table structure for table `notifications` */

DROP TABLE IF EXISTS `notifications`;

CREATE TABLE `notifications` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `type` varchar(20) DEFAULT NULL,
  `content` varchar(200) DEFAULT NULL,
  `created_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `checked` int(1) DEFAULT '0',
  `user_email` varchar(50) DEFAULT NULL,
  `mail_sent` int(1) DEFAULT '0' COMMENT 'checking if mail is sent for not',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8;

/*Data for the table `notifications` */

insert  into `notifications`(`id`,`type`,`content`,`created_time`,`checked`,`user_email`,`mail_sent`) values (1,'disconnect','camera 3 is disconnected','2021-05-11 16:06:54',1,'pang@gmail.com',1),(3,'camera disconnect','Camera \"Camera 3\" with url of \"D:\\stream_server\\test.mp4\" disconnected','2021-05-11 17:18:58',1,'pang@gmail.com',0);

/*Table structure for table `result` */

DROP TABLE IF EXISTS `result`;

CREATE TABLE `result` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `model` varchar(30) DEFAULT NULL,
  `model_prob` int(3) DEFAULT NULL,
  `plate_number` varchar(20) DEFAULT NULL,
  `plate_prob` int(3) DEFAULT NULL,
  `vehicle_type` int(2) DEFAULT '0' COMMENT 'car=0, bus=1,',
  `color` int(2) DEFAULT '0',
  `color_prob` int(4) DEFAULT '0',
  `created` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'created date',
  `log_file` varchar(255) DEFAULT NULL,
  `camera_id` int(11) unsigned DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8;

/*Data for the table `result` */

insert  into `result`(`id`,`model`,`model_prob`,`plate_number`,`plate_prob`,`vehicle_type`,`color`,`color_prob`,`created`,`log_file`,`camera_id`) values (1,'BMW_1990',90,'CD123E',95,1,1,22,'2021-06-21 15:48:49','/log/CD123E.jpg',1),(2,'audi_a1',50,'WL123F',90,0,0,0,'2021-06-24 00:40:02','/log/1233.jpg',1),(3,'audi_a1',50,'WL123F',90,0,0,0,'2021-06-24 01:29:22','/log/1233.jpg',1);

/*Table structure for table `roles` */

DROP TABLE IF EXISTS `roles`;

CREATE TABLE `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8;

/*Data for the table `roles` */

insert  into `roles`(`id`,`title`,`description`) values (1,'Manager','Super Admin with all rights...'),(2,'User','Can View Dashboard, Admins & Roles'),(6,'Developer','Can View Dashboard &  Admins List');

/*Table structure for table `tbl_admin` */

DROP TABLE IF EXISTS `tbl_admin`;

CREATE TABLE `tbl_admin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `register_date` datetime DEFAULT NULL,
  `icon_path` varchar(255) DEFAULT NULL,
  `role_id` int(11) DEFAULT '2',
  PRIMARY KEY (`id`),
  KEY `admins_ibfk_1` (`role_id`),
  CONSTRAINT `admins_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8;

/*Data for the table `tbl_admin` */

insert  into `tbl_admin`(`id`,`name`,`email`,`password`,`register_date`,`icon_path`,`role_id`) values (1,'Admin','test@gmail.com','123456','2020-07-08 16:55:41',NULL,1),(2,'Aman','aman@gmail.com','123456','2020-09-04 16:59:17','',2),(20,'test','test@outlook.com','test123','2021-02-10 00:00:00',NULL,2);

/*Table structure for table `videos` */

DROP TABLE IF EXISTS `videos`;

CREATE TABLE `videos` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `video_filename` varchar(255) DEFAULT NULL COMMENT 'video file name',
  `camera_id` int(11) DEFAULT NULL COMMENT 'camera id',
  `thumb_name` varchar(255) DEFAULT NULL COMMENT 'thumb nail image file name',
  `start_time` datetime DEFAULT NULL COMMENT 'video recording begin time',
  `end_time` datetime DEFAULT NULL COMMENT 'video recording endtime',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `videos` */

/*Table structure for table `zones` */

DROP TABLE IF EXISTS `zones`;

CREATE TABLE `zones` (
  `id` int(5) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(20) DEFAULT NULL COMMENT 'zone name',
  `user_id` int(11) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8;

/*Data for the table `zones` */

insert  into `zones`(`id`,`name`,`user_id`) values (1,'zone1',1),(2,'zone2',1),(5,'zone3',1);

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
