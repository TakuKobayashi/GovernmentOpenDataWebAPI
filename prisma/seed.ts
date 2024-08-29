import fs from 'fs';
import fg from 'fast-glob';
import readline from 'readline';
import { prismaClient } from '../src/utils/prisma-common';

const main = async () => {
  const sqlFilePathes = fg.sync(['resources', 'sqls', '**', '*.sql'].join('/'));
  for (const sqlFilePath of sqlFilePathes) {
    await new Promise<void>((resolve, reject) => {
      const executeSqlPromises: Promise<number>[] = [];
      const insertSqlFileStream = fs.createReadStream(sqlFilePath);
      const reader = readline.createInterface({ input: insertSqlFileStream });
      reader.on('line', async (insertSql) => {
        executeSqlPromises.push(prismaClient.$executeRawUnsafe(insertSql));
      });
      reader.on('close', async () => {
        await Promise.all(executeSqlPromises);
        resolve();
      });
    });
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prismaClient.$disconnect()
  })