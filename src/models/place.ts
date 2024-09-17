import XLSX, { WorkBook } from 'xlsx';
import crypto from 'crypto';
import { requestGeoCoder, requestReverceGeoCoder } from '../utils/yahoo-api';
import { readStreamCSVFileToHeaderObjs } from '../utils/util';
import { encodeBase32 } from 'geohashing';
import { normalize } from '@geolonia/normalize-japanese-addresses';
import { GeoJSON } from 'geojson';
import path from 'path';
import fs from 'fs';
import _ from 'lodash';

const candidateNameKeys = ['施設名', '名称', 'タイトル', '設置場所', '施設名称', '施設名', '保育園名'];
const candidateAddressKeys = ['所在地', '住所', '所在地_連結表記', '施設所在地'];
const candidateProvinceKeys = ['都道府県名', '所在地_都道府県'];
const candidateCityKeys = ['市区町村名', '所在地_市区町村'];
const candidateLatKeys = ['緯度', 'X座標'];
const candidateLonKeys = ['経度', 'Y座標'];
const candidateMalesCountKeys = ['男性トイレ数', '男性トイレ_総数', '男性トイレ総数'];
const candidateFemalesCountKeys = ['女性トイレ数', '女性トイレ_総数', '女性トイレ総数'];
const multipurposesCountKeys = ['バリアフリートイレ数', '多機能トイレ_数', '多機能トイレ数'];

export interface PlaceInterface {
  name: string;
  hashcode: string;
  province?: string;
  city?: string;
  address?: string;
  lat?: number;
  lon?: number;
  geohash?: string;
}

export class PlaceModel implements PlaceInterface {
  name: string = '';
  hashcode: string = '';
  province?: string;
  city?: string;
  address?: string;
  lat?: number;
  lon?: number;
  geohash?: string;

  // 何らかの事情でデータが壊れていてフォローができない場合のフラグ
  private importInvalidLogs: { message: string; [key: string]: any }[] = [];
  private stashExtraInfo: { [key: string]: any } = {};

  updateStashExtraInfo(extraInfo: { [key: string]: any }) {
    this.stashExtraInfo = { ...this.stashExtraInfo, ...extraInfo };
  }

  clearStashExtraInfo() {
    this.stashExtraInfo = {};
  }

  getStashExtraInfo(): { [key: string]: any } {
    return this.stashExtraInfo;
  }

  getImportInvalidLogs(): { [key: string]: any }[] {
    return this.importInvalidLogs;
  }

  private adjustAddress() {
    // 住所が明らかに長すぎる場合は文字化けしている可能性がある
    if (this.address && this.address.length > 255) {
      this.importInvalidLogs.push({
        message: 'address Too Long',
        address: this.address,
      });
      this.address = undefined;
    }
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
      if (this.lat < -90 || 90 < this.lat || this.lon < -180 || 180 < this.lon) {
        // 入れ替えではなく小数点の打ち間違いの疑いがある場合は緯度経度はないものとする
        if (this.lat <= 180 && -90 <= this.lon && this.lon <= 90) {
          const prevLat = this.lat;
          const prevLon = this.lon;
          this.lat = prevLon;
          this.lon = prevLat;
        } else {
          if (!this.address) {
            this.importInvalidLogs.push({
              message: 'mission range lat lon',
              lat: this.lat,
              lon: this.lon,
            });
          }
          this.lat = undefined;
          this.lon = undefined;
        }
      }
    }
  }

  setCalcedHashCode() {
    if (this.name) {
      if (this.lat && this.lon) {
        const hashSource = [this.name, this.lat, this.lon].join(':');
        this.hashcode = crypto.createHash('sha512').update(hashSource).digest('hex');
      } else if (this.address) {
        const hashSource = [this.name, this.address].join(':');
        this.hashcode = crypto.createHash('sha512').update(hashSource).digest('hex');
      }
    }
  }

  private validateName() {
    if (this.name.length > 255) {
      // 何らかの理由で住所がおかしくて緯度・経度が取得できなかった場合、データが壊れたとみなす
      this.importInvalidLogs.push({
        message: 'error name strings',
        name: this.name,
      });
      this.name = '';
    }
  }

  adjustCustomData() {
    if (this.lat) {
      this.lat = Number(this.lat);
    }
    if (this.lon) {
      this.lon = Number(this.lon);
    }
    this.adjustAddress();
    this.adjustLatLon();
    this.setCalcedHashCode();
    this.validateName();
  }

  async setLocationInfo() {
    if (this.lat && this.lon && !this.address) {
      const reverceGeoCodeResultData = await requestReverceGeoCoder(this.lat, this.lon).catch((error) => {
        this.importInvalidLogs.push({
          message: 'missing request reverceGeocoder',
          lat: this.lat,
          lon: this.lon,
          address: this.address,
          error: error,
        });
      });
      const placeFeatureData = reverceGeoCodeResultData?.Feature || [];
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
        this.address = addressData.Address?.normalize('NFKC');
      }
    } else if (!this.lat && !this.lon && this.address) {
      const geoCodeResultData = await requestGeoCoder(this.address).catch((error) => {
        this.importInvalidLogs.push({
          message: 'missing request geocoder',
          lat: this.lat,
          lon: this.lon,
          address: this.address,
          error: error,
        });
      });
      const gecodeData = geoCodeResultData?.Feature || [];
      const feature = gecodeData[0];
      if (feature) {
        const [lon, lat] = feature.Geometry.Coordinates.split(',');
        this.lat = Number(lat);
        this.lon = Number(lon);
        if (feature.Property?.Address) {
          this.address = feature.Property.Address;
        }
      }
    }
    if (this.address) {
      this.address = this.address.replace(/,/g, '-');
      this.address = this.address.split(' ').join('');
    }
    await this.normalizeAddress();
    this.setGeohash();
  }

  private async normalizeAddress() {
    if (this.address) {
      const normalizedAddress = await normalize(this.address);
      this.province = normalizedAddress.pref;
      this.city = normalizedAddress.city;
    }
  }

  private setGeohash() {
    if (this.lat && this.lon) {
      this.geohash = encodeBase32(this.lat, this.lon);
    } else {
      // 何らかの理由で住所がおかしくて緯度・経度が取得できなかった場合、データが壊れたとみなす
      this.importInvalidLogs.push({
        message: 'error address strings',
        lat: this.lat,
        lon: this.lon,
        address: this.address,
      });
    }
  }
}

export function buildPlacesDataFromRowObjs(rowObjs: { [key: string]: any }[]): PlaceModel[] {
  const newPlaceModels: Set<PlaceModel> = new Set();
  for (const rowObj of rowObjs) {
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
        newPlaceModel.updateStashExtraInfo({ males_count: Number(rowObj[rowKey]) });
      } else if (candidateFemalesCountKeys.includes(rowKey)) {
        newPlaceModel.updateStashExtraInfo({ females_count: Number(rowObj[rowKey]) });
      } else if (multipurposesCountKeys.includes(rowKey)) {
        newPlaceModel.updateStashExtraInfo({ multipurposes_count: Number(rowObj[rowKey]) });
      }
    }
    newPlaceModels.add(newPlaceModel);
  }
  return adjustAndFilterAcceptPlaceModels(Array.from(newPlaceModels));
}

export function buildPlacesDataFromWorkbook(workbook: WorkBook): PlaceModel[] {
  const convertedHashcodeApiFormatDataObjs: { [hashcode: string]: PlaceModel } = {};
  const sheetNames = Object.keys(workbook.Sheets);
  for (const sheetName of sheetNames) {
    const themeRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    const hashcodeBuildObjs = buildPlacesDataFromRowObjs(themeRows);
    for (const hashcode of Object.keys(hashcodeBuildObjs)) {
      convertedHashcodeApiFormatDataObjs[hashcode] = hashcodeBuildObjs[hashcode];
    }
  }
  return Object.values(convertedHashcodeApiFormatDataObjs);
}

export function buildPlacesDataFromGeoJson(jsonObj: GeoJSON): PlaceModel[] {
  if (jsonObj.type === 'FeatureCollection') {
    return jsonObj.features.map((geoJsonFeature) => buildPlacesDataFromGeoJson(geoJsonFeature)).flat();
  } else if (jsonObj.type === 'Point') {
    const [lon, lat] = jsonObj.coordinates;
    const placeModel = new PlaceModel();
    placeModel.lat = lat;
    placeModel.lon = lon;
    return [placeModel];
  } else if (jsonObj.type === 'MultiPoint') {
    const multiPoints = jsonObj.coordinates;
    const placeModel = new PlaceModel();
    const multiLonLat = _.zip(multiPoints);
    placeModel.lon = _.mean(multiLonLat[0]);
    placeModel.lat = _.mean(multiLonLat[1]);
    return [placeModel];
  } else if (jsonObj.type === 'LineString') {
    const linStringPoints = jsonObj.coordinates;
    const placeModel = new PlaceModel();
    const multiLonLat = _.zip(linStringPoints);
    placeModel.lon = _.mean(multiLonLat[0]);
    placeModel.lat = _.mean(multiLonLat[1]);
    return [placeModel];
  } else if (jsonObj.type === 'MultiLineString') {
    const placeModels: PlaceModel[] = [];
    const multiLineStrings = jsonObj.coordinates;
    for (const lineString of multiLineStrings) {
      const placeModel = new PlaceModel();
      const multiLonLat = _.zip(lineString);
      placeModel.lon = _.mean(multiLonLat[0]);
      placeModel.lat = _.mean(multiLonLat[1]);
      placeModels.push(placeModel);
    }
    return placeModels;
  } else if (jsonObj.type === 'Polygon') {
    const placeModels: PlaceModel[] = [];
    const polygons = jsonObj.coordinates;
    for (const polygon of polygons) {
      const placeModel = new PlaceModel();
      const multiLonLat = _.zip(polygon);
      placeModel.lon = _.mean(multiLonLat[0]);
      placeModel.lat = _.mean(multiLonLat[1]);
      placeModels.push(placeModel);
    }
    return placeModels;
  } else if (jsonObj.type === 'MultiPolygon') {
    const placeModels: PlaceModel[] = [];
    const multiPolygons = jsonObj.coordinates;
    for (const polygon of multiPolygons) {
      const placeModel = new PlaceModel();
      const multiLonLat = _.zip(polygon);
      placeModel.lon = _.mean(multiLonLat[0]);
      placeModel.lat = _.mean(multiLonLat[1]);
      placeModels.push(placeModel);
    }
    return placeModels;
  } else if (jsonObj.type === 'GeometryCollection') {
    return jsonObj.geometries.map((geometry) => buildPlacesDataFromGeoJson(geometry)).flat();
  } else if (jsonObj.type === 'Feature') {
    const placeModels = buildPlacesDataFromGeoJson(jsonObj.geometry);
    const property = jsonObj.properties as object;
    for (const propertyKeyName of Object.keys(property)) {
      for (const placeModel of placeModels) {
        if (candidateAddressKeys.includes(propertyKeyName)) {
          placeModel.address = property[propertyKeyName].toString().trim().normalize('NFKC');
        } else if (candidateNameKeys.includes(propertyKeyName)) {
          placeModel.name = property[propertyKeyName].toString().trim().normalize('NFKC');
        } else {
          placeModel.updateStashExtraInfo({ [propertyKeyName]: property[propertyKeyName].toString().trim().normalize('NFKC') });
        }
      }
    }
    return placeModels;
  }

  return [];
}

export function adjustAndFilterAcceptPlaceModels(placeModels: PlaceModel[]): PlaceModel[] {
  const convertedHashcodeApiFormatDataObjs: { [hashcode: string]: PlaceModel } = {};
  for (const placeModel of placeModels) {
    placeModel.adjustCustomData();
    if (placeModel.name && ((placeModel.lat && placeModel.lon) || placeModel.address)) {
      convertedHashcodeApiFormatDataObjs[placeModel.hashcode] = placeModel;
    }
  }
  return Object.values(convertedHashcodeApiFormatDataObjs);
}

export async function loadResourceFileAndBuildPlaceModels(filePath: string): Promise<PlaceModel[]> {
  return new Promise<PlaceModel[]>((resolve, reject) => {
    try {
      if (path.extname(filePath) === '.csv') {
        readStreamCSVFileToHeaderObjs(filePath)
          .then((parsedCsvObjs) => {
            resolve(buildPlacesDataFromRowObjs(parsedCsvObjs));
          })
          .catch((error) => {
            reject(error);
          });
      } else if (['.xlsx', '.xls'].includes(path.extname(filePath))) {
        const workbook = XLSX.readFile(filePath);
        resolve(buildPlacesDataFromWorkbook(workbook));
      } else if (['.json', '.geojson'].includes(path.extname(filePath))) {
        const jsonString = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(jsonString);
        const placeModels = buildPlacesDataFromGeoJson(json);
        resolve(adjustAndFilterAcceptPlaceModels(placeModels));
      }
    } catch (error) {
      reject(error);
    }
  });
}
