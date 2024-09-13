import axios from 'axios';

export async function requestGeoCoder(address: string): Promise<any> {
  const response = await axios
    .get('https://map.yahooapis.jp/geocode/V1/geoCoder', {
      params: { appid: process.env.YAHOO_API_CLIENT_ID, query: address, output: 'json' },
    })
    .catch((error) => {
      return Promise.reject(error);
    });
  return response.data;
}

export async function requestReverceGeoCoder(lat: number, lon: number): Promise<any> {
  const response = await axios
    .get('https://map.yahooapis.jp/geoapi/V1/reverseGeoCoder', {
      params: { appid: process.env.YAHOO_API_CLIENT_ID, lat: lat, lon: lon, output: 'json' },
    })
    .catch((error) => {
      return Promise.reject(error);
    });
  return response.data;
}

export async function requestKeyphrase(sentence: string, requestId: string | number = 1): Promise<any> {
  const response = await axios.post(
    'https://jlp.yahooapis.jp/KeyphraseService/V2/extract',
    { id: requestId, jsonrpc: '2.0', method: 'jlp.keyphraseservice.extract', params: { q: sentence } },
    { headers: { 'Content-Type': 'application/json', 'User-Agent': `Yahoo AppID: ${process.env.YAHOO_API_CLIENT_ID}` } },
  );
  return response.data;
}

export async function requestAnalysisParse(sentence: string, requestId: string | number = 1): Promise<any> {
  const response = await axios.post(
    'https://jlp.yahooapis.jp/MAService/V2/parse',
    { id: requestId, jsonrpc: '2.0', method: 'jlp.maservice.parse', params: { q: sentence } },
    { headers: { 'Content-Type': 'application/json', 'User-Agent': `Yahoo AppID: ${process.env.YAHOO_API_CLIENT_ID}` } },
  );
  return response.data;
}
