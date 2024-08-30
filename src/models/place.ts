import XLSX, { WorkBook } from 'xlsx';
import axios from 'axios';
import { encodeBase32 } from 'geohashing';

const candidateNameKeys = ['施設名', '名称'];
const candidateAddressKeys = ['所在地', '住所', '所在地_連結表記'];
const candidateProvinceKeys = ['都道府県名', '所在地_都道府県'];
const candidateCityKeys = ['市区町村名', '所在地_市区町村'];
const candidateLatKeys = ['緯度', 'X座標'];
const candidateLonKeys = ['経度', 'Y座標'];
const candidateMalesCountKeys = ['男性トイレ数', '男性トイレ_総数', '男性トイレ総数'];
const candidateFemalesCountKeys = ['女性トイレ数', '女性トイレ_総数', '女性トイレ総数'];
const multipurposesCountKeys = ['バリアフリートイレ数', '多機能トイレ_数', '多機能トイレ数'];

export interface PlaceInterface {
  name: string;
  province?: string;
  address?: string;
  lat?: number;
  lon?: number;
  geohash?: string;
  extra_info: { [key: string]: any };
}

export class PlaceModel implements PlaceInterface {
  name: string = '';
  province?: string;
  city?: string;
  address?: string;
  lat?: number;
  lon?: number;
  geohash?: string;
  extra_info: { [key: string]: any } = {};

  private adjustAddress() {
    if (this.address && this.province && !this.address.startsWith(this.province)) {
      if (this.city) {
        if (this.address.startsWith(this.city)) {
          this.address = this.province.toString() + this.address.toString();
        } else {
          this.address = this.province.toString() + this.city.toString() + this.address.toString();
        }
      }
    }
  }

  private adjustLatLon() {
    if (this.lat && this.lon) {
      // 緯度、経度が間違えて入れ替えている場合がある
      if (this.lat < -90 || 90 < this.lat) {
        const prevLat = this.lat;
        const prevLon = this.lon;
        this.lat = prevLon;
        this.lon = prevLat;
      }
    }
  }

  async setLocationInfo() {
    this.adjustAddress();
    this.adjustLatLon();
    if (this.lat && this.lon && !this.address) {
      const response = await axios.get('https://map.yahooapis.jp/geoapi/V1/reverseGeoCoder', {
        params: { appid: process.env.YAHOO_API_CLIENT_ID, lat: this.lat, lon: this.lon, output: 'json' },
      });
      const placeFeatureData = response.data.Feature || [];
      if (placeFeatureData[0]) {
        const addressData = placeFeatureData[0].Property || {};
        const addressElements = addressData.AddressElement || [];
        if (!this.province) {
          const prefectureElement = addressElements.find((addressElement) => addressElement.Level === 'prefecture');
          this.province = prefectureElement?.Name;
        }
        if (!this.city) {
          const cityElement = addressElements.find((addressElement) => addressElement.Level === 'city');
          this.city = cityElement?.Name;
        }
        this.address = addressData.Address;
      }
    } else if (!this.lat && !this.lon && this.address) {
      const response = await axios.get('https://map.yahooapis.jp/geocode/V1/geoCoder', {
        params: { appid: process.env.YAHOO_API_CLIENT_ID, query: this.address, output: 'json' },
      });
      const gecodeData = response.data.Feature || [];
      const feature = gecodeData[0];
      if (feature) {
        const [lon, lat] = feature.Geometry.Coordinates.split(',');
        this.lat = Number(lat);
        this.lon = Number(lon);
      }
    }
    this.setGeohash();
  }

  private setGeohash() {
    if (this.lat && this.lon) {
      this.geohash = encodeBase32(this.lat, this.lon);
    }
  }
}

export async function buildPlacesDataFromWorkbook(workbook: WorkBook): Promise<PlaceModel[]> {
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
        } else if (candidateProvinceKeys.includes(rowKey)) {
          newPlaceModel.province = rowObj[rowKey].toString().trim();
        } else if (candidateCityKeys.includes(rowKey)) {
          newPlaceModel.city = rowObj[rowKey].toString().trim();
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
        await newPlaceModel.setLocationInfo();
        convertedApiFormatDataObjs.push(newPlaceModel);
      }
    }
  }
  return convertedApiFormatDataObjs;
}
