import XLSX, { WorkBook } from 'xlsx';
const candidateNameKeys = ['施設名', '名称'];
const candidateAddressKeys = ['所在地', '住所', '所在地_連結表記'];
const candidateLatKeys = ['緯度', 'X座標'];
const candidateLonKeys = ['経度', 'Y座標'];
const candidateMalesCountKeys = ['男性トイレ数', '男性トイレ_総数', '男性トイレ総数'];
const candidateFemalesCountKeys = ['女性トイレ数', '女性トイレ_総数', '女性トイレ総数'];
const multipurposesCountKeys = ['バリアフリートイレ数', '多機能トイレ_数', '多機能トイレ数'];

export function importPlaceDataFromWorkbook(workbook: WorkBook, categoryId: number): any[] {
  const convertedApiFormatDataObjs: any[] = [];
  const sheetNames = Object.keys(workbook.Sheets);
  for (const sheetName of sheetNames) {
    const themeRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    for (const rowObj of themeRows) {
      const rowKeys = Object.keys(rowObj);
      const newPlaceModel: { [key: string]: any } = {
        category_id: categoryId,
        extra_info: {
          males_count: 0,
          females_count: 0,
          multipurposes_count: 0,
        },
      };
      for (const rowKey of rowKeys) {
        if (candidateNameKeys.includes(rowKey)) {
          newPlaceModel.name = rowObj[rowKey];
        } else if (candidateAddressKeys.includes(rowKey)) {
          newPlaceModel.address = rowObj[rowKey].toString().normalize('NFKC');
        } else if (candidateLatKeys.includes(rowKey)) {
          newPlaceModel.lat = Number(rowObj[rowKey]);
        } else if (candidateLonKeys.includes(rowKey)) {
          newPlaceModel.lon = Number(rowObj[rowKey]);
        } else if (candidateMalesCountKeys.includes(rowKey)) {
          newPlaceModel.extra_info.males_count = Number(rowObj[rowKey]);
        } else if (candidateFemalesCountKeys.includes(rowKey)) {
          newPlaceModel.extra_info.females_count = Number(rowObj[rowKey]);
        } else if (multipurposesCountKeys.includes(rowKey)) {
          newPlaceModel.extra_info.multipurposes_count = Number(rowObj[rowKey]);
        }
      }
      if (newPlaceModel.name && ((newPlaceModel.lat && newPlaceModel.lon) || newPlaceModel.address)) {
        if (newPlaceModel.lat && newPlaceModel.lon && !newPlaceModel.address) {
        } else if (newPlaceModel.lat && newPlaceModel.lon && newPlaceModel.address) {
        }
        convertedApiFormatDataObjs.push(newPlaceModel);
      }
    }
  }
  return convertedApiFormatDataObjs;
}
