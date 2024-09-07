import path from 'path';
import axios from 'axios';
import { prismaClient } from '../utils/prisma-common';
import { saveToLocalFileFromString } from '../utils/util';

export async function importGsiMuni() {
  const downloadMuniJSFileBinaryResponse = await axios.get('https://maps.gsi.go.jp/js/muni.js', { responseType: 'arraybuffer' });
  const textData = downloadMuniJSFileBinaryResponse.data.toString();
  const muniJSFilePath = path.join('resources', 'libraries', 'muni.js');
  saveToLocalFileFromString(muniJSFilePath, textData);
  const matches = textData.match(/'(.*?)'/g) || [];
  const csvLines = matches.map((matched) => matched.substr(1, matched.length - 2));
  const newGsiMuniObjs: { prefecture_number: number; prefecture_name: string; municd: number; municipality: string }[] = [];
  for (const csvLine of csvLines) {
    const cells = csvLine.split(',');
    newGsiMuniObjs.push({
      prefecture_number: Number(cells[0]),
      prefecture_name: cells[1],
      municd: Number(cells[2]),
      municipality: cells[3].toString().trim().normalize('NFKC'),
    });
  }
  const currentGsiMuniObjs = await prismaClient.gsimuni.findMany({
    where: {
      municd: {
        in: newGsiMuniObjs.map((gsiMuniObj) => gsiMuniObj.municd),
      },
    },
    select: {
      municd: true,
    },
  });
  const currentMunicdSet: Set<number> = new Set(currentGsiMuniObjs.map((currentGsiMuniObj) => currentGsiMuniObj.municd));
  await prismaClient.gsimuni.createMany({
    data: newGsiMuniObjs.filter((gsiMuniObj) => !currentMunicdSet.has(gsiMuniObj.municd)),
  });
}
