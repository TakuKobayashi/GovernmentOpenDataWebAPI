import _ from 'lodash';
import { PrismaClient } from '@prisma/client';

export const prismaClient = new PrismaClient({ log: ['query'] });

export async function findInBatches(
  tableName: string,
  filter: { [columnName: string]: any } = {},
  batchSize: number = 1000,
  inBatches: (models: any[]) => Promise<void>,
) {
  const filterObj = {
    id: {
      gt: 0,
    },
    ...filter,
  };
  while (true) {
    const models = await prismaClient[tableName].findMany({
      where: filterObj,
      take: batchSize,
      orderBy: [
        {
          id: 'asc',
        },
      ],
    });
    const maxId = _.maxBy(models, (model: any) => model.id)?.id;
    if (maxId) {
      filterObj.id = {
        gt: maxId,
      };
    } else {
      break;
    }
    await inBatches(models);
  }
}
