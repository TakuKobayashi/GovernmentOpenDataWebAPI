import XLSX, { WorkBook } from 'xlsx';
import axios from 'axios';

const candidateNameKeys = ['施設名', '名称'];
const candidateAddressKeys = ['所在地', '住所', '所在地_連結表記'];
const candidateLatKeys = ['緯度', 'X座標'];
const candidateLonKeys = ['経度', 'Y座標'];
const candidateMalesCountKeys = ['男性トイレ数', '男性トイレ_総数', '男性トイレ総数'];
const candidateFemalesCountKeys = ['女性トイレ数', '女性トイレ_総数', '女性トイレ総数'];
const multipurposesCountKeys = ['バリアフリートイレ数', '多機能トイレ_数', '多機能トイレ数'];

export interface PlaceInterface {
  name: string;
  address?: string;
  lat?: number;
  lon?: number;
  geohash?: string;
  extra_info: { [key: string]: any };
}

export class PlaceModel implements PlaceInterface {
  name: string = '';
  address?: string;
  lat?: number;
  lon?: number;
  geohash?: string;
  extra_info: { [key: string]: any } = {};

  async setLocationInfo() {
    if (this.lat && this.lon && !this.address) {
    } else if (!this.lat && !this.lon && this.address) {
      const response = await axios.get('https://msearch.gsi.go.jp/address-search/AddressSearch', {
        params: { q: this.address },
      });
      const gecodeData = response.data || [];
      const feature = gecodeData[0];
      if (feature) {
        const [lon, lat] = feature.geometry.coordinates;
        return {
          title: feature.properties.title,
          address: feature.properties.title,
          latitude: lat,
          longitude: lon,
        };
      }
    }
  }
}

export function importPlaceDataFromWorkbook(workbook: WorkBook): PlaceModel[] {
  const convertedApiFormatDataObjs: PlaceModel[] = [];
  const sheetNames = Object.keys(workbook.Sheets);
  for (const sheetName of sheetNames) {
    const themeRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    for (const rowObj of themeRows) {
      const rowKeys = Object.keys(rowObj);
      const newPlaceModel = new PlaceModel();
      for (const rowKey of rowKeys) {
        if (candidateNameKeys.includes(rowKey)) {
          newPlaceModel.name = rowObj[rowKey].toString().trim();
        } else if (candidateAddressKeys.includes(rowKey)) {
          newPlaceModel.address = rowObj[rowKey].toString().trim().normalize('NFKC');
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
        convertedApiFormatDataObjs.push(newPlaceModel);
      }
    }
  }
  return convertedApiFormatDataObjs;
}
