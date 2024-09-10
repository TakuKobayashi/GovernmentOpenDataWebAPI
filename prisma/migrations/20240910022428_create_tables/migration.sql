-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `categories_title_key`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `places` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hashcode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `province` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lon` DOUBLE NULL,
    `geohash` VARCHAR(191) NULL,

    UNIQUE INDEX `places_hashcode_key`(`hashcode`),
    INDEX `places_geohash_idx`(`geohash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `source_id` INTEGER NOT NULL,
    `source_type` ENUM('Place') NOT NULL,
    `category_id` INTEGER NOT NULL,
    `extra_info` JSON NULL,

    UNIQUE INDEX `data_categories_source_type_source_id_category_id_key`(`source_type`, `source_id`, `category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crawlers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `origin_url` VARCHAR(255) NOT NULL,
    `origin_file_ext` VARCHAR(191) NOT NULL DEFAULT '.html',
    `origin_title` VARCHAR(255) NULL,
    `checksum` VARCHAR(191) NULL,
    `need_manual_edit` BOOLEAN NOT NULL DEFAULT false,
    `last_updated_at` DATETIME(3) NULL,
    `origin_file_encoder` VARCHAR(191) NULL,
    `origin_file_size` BIGINT NOT NULL DEFAULT 0,

    UNIQUE INDEX `crawlers_origin_url_key`(`origin_url`),
    INDEX `crawlers_last_updated_at_idx`(`last_updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gsimunis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prefecture_number` INTEGER NOT NULL,
    `prefecture_name` VARCHAR(191) NOT NULL,
    `municd` INTEGER NOT NULL,
    `municipality` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `gsimunis_municd_key`(`municd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crawler_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `crawler_type` ENUM('CrawlerRoot', 'Crawler') NOT NULL,
    `crawler_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,

    UNIQUE INDEX `crawler_categories_crawler_type_crawler_id_category_id_key`(`crawler_type`, `crawler_id`, `category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crawler_roots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(191) NOT NULL,
    `last_updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `crawler_roots_url_key`(`url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crawler_root_relations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `to_url` VARCHAR(191) NOT NULL,
    `to_crawler_type` ENUM('CrawlerRoot', 'Crawler') NOT NULL,
    `from_crawler_root_id` INTEGER NOT NULL,

    INDEX `crawler_root_relations_to_crawler_type_to_url_idx`(`to_crawler_type`, `to_url`),
    UNIQUE INDEX `crawler_root_relations_from_crawler_root_id_to_crawler_type__key`(`from_crawler_root_id`, `to_crawler_type`, `to_url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crawler_keywords` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `crawler_id` INTEGER NOT NULL,
    `keyword_id` INTEGER NOT NULL,
    `score` DOUBLE NOT NULL DEFAULT 0,

    INDEX `crawler_keywords_crawler_id_idx`(`crawler_id`),
    UNIQUE INDEX `crawler_keywords_keyword_id_crawler_id_key`(`keyword_id`, `crawler_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `keywords` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `word` VARCHAR(191) NOT NULL,
    `appear_count` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `keywords_word_key`(`word`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
