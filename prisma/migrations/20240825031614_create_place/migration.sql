-- CreateTable
CREATE TABLE `place` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lon` DOUBLE NULL,
    `geohash` VARCHAR(191) NULL,
    `category_id` INTEGER NULL,
    `extra_info` JSON NULL,

    INDEX `place_geohash_idx`(`geohash`),
    INDEX `place_address_idx`(`address`),
    INDEX `place_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `place` ADD CONSTRAINT `place_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
