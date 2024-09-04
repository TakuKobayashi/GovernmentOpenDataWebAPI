-- CreateTable
CREATE TABLE `category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `category_title_key`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `place` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `province` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lon` DOUBLE NULL,
    `geohash` VARCHAR(191) NULL,
    `extra_info` JSON NULL,

    INDEX `place_geohash_idx`(`geohash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `place_category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `place_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,

    UNIQUE INDEX `place_category_category_id_place_id_key`(`category_id`, `place_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crawler` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `origin_url` VARCHAR(191) NOT NULL,
    `origin_title` VARCHAR(191) NULL,
    `checksum` VARCHAR(191) NULL,
    `need_manual_edit` BOOLEAN NOT NULL DEFAULT false,
    `last_updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `crawler_origin_url_key`(`origin_url`),
    INDEX `crawler_last_updated_at_idx`(`last_updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gsimuni` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prefecture_number` INTEGER NOT NULL,
    `prefecture_name` VARCHAR(191) NOT NULL,
    `municd` INTEGER NOT NULL,
    `municipality` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `gsimuni_municd_key`(`municd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crawler_category` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `crawler_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,

    UNIQUE INDEX `crawler_category_crawler_id_category_id_key`(`crawler_id`, `category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crawler_root` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `search_word` VARCHAR(191) NULL,

    UNIQUE INDEX `crawler_root_url_key`(`url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crawler_parent_and_child` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `crawler_id` INTEGER NOT NULL,
    `crawler_root_id` INTEGER NOT NULL,

    UNIQUE INDEX `crawler_parent_and_child_crawler_root_id_crawler_id_key`(`crawler_root_id`, `crawler_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
