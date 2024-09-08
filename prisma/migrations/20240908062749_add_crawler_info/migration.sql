-- AlterTable
ALTER TABLE `crawlers` ADD COLUMN `origin_file_encoder` VARCHAR(191) NULL,
    ADD COLUMN `origin_file_size` BIGINT NOT NULL DEFAULT 0;
