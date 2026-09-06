// src/utils/geoUtil.ts
import { Geolocation } from '@capacitor/geolocation';

export interface DeviceCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Requests device location permission and gets current coordinates.
 * Supports Android Capacitor native permission flow and Web/PWA fallback.
 */
export async function requestAndGetCurrentPosition(): Promise<DeviceCoordinates> {
  // Strategy 1: Capacitor Native Geolocation (Triggers Android native runtime permission prompt)
  try {
    const permStatus = await Geolocation.checkPermissions();
    if (permStatus.location !== 'granted') {
      const reqRes = await Geolocation.requestPermissions();
      if (reqRes.location !== 'granted') {
        throw new Error('未获得位置定位权限，请在系统设置中开启');
      }
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 8000,
    });
    return {
      latitude: parseFloat(pos.coords.latitude.toFixed(4)),
      longitude: parseFloat(pos.coords.longitude.toFixed(4)),
    };
  } catch (capErr) {
    console.warn('Capacitor native geolocation failed or not in native runtime:', capErr);
  }

  // Strategy 2: Browser standard Geolocation
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: parseFloat(pos.coords.latitude.toFixed(4)),
            longitude: parseFloat(pos.coords.longitude.toFixed(4)),
          });
        },
        (err) => {
          let msg = '未能获取到实时GPS';
          if (err.code === 1) {
            msg = '位置权限被拒绝，请在手机设置或浏览器权限中允许访问位置';
          } else if (err.code === 2) {
            msg = '位置不可用，请确保GPS已开启';
          } else if (err.code === 3) {
            msg = '定位请求超时';
          }
          reject(new Error(msg));
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    });
  }

  throw new Error('当前环境不支持地理位置获取');
}

/**
 * Reverse geocodes latitude and longitude into a clean city / district name (e.g., "成都市", "北京市海淀区").
 */
export async function getCityNameFromCoords(lat: number, lng: number): Promise<string> {
  // Strategy 1: BigDataCloud Reverse Geocoding API (free client-side, CORS allowed, returns Chinese administrative divisions)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=zh`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.principalSubdivision || data.locality;
      const district = data.locality && data.locality !== city ? data.locality : '';
      if (city) {
        return district ? `${city} ${district}` : city;
      }
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-CN`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.county || addr.state || addr.province;
      const district = addr.suburb || addr.district || addr.borough || '';
      if (city) {
        return district && !city.includes(district) ? `${city} ${district}` : city;
      }
    }
  } catch {
    // Continue to fallback
  }

  // Strategy 3: Boundary heuristic for major Chinese regions (fast offline fallback)
  if (lat >= 39.4 && lat <= 41.0 && lng >= 115.4 && lng <= 117.5) return '北京市';
  if (lat >= 30.7 && lat <= 31.9 && lng >= 120.8 && lng <= 122.2) return '上海市';
  if (lat >= 22.5 && lat <= 23.9 && lng >= 112.9 && lng <= 114.1) return '广州市';
  if (lat >= 22.4 && lat <= 22.9 && lng >= 113.7 && lng <= 114.6) return '深圳市';
  if (lat >= 30.1 && lat <= 31.4 && lng >= 102.9 && lng <= 104.9) return '成都市';
  if (lat >= 29.2 && lat <= 30.6 && lng >= 118.3 && lng <= 120.7) return '杭州市';
  if (lat >= 29.9 && lat <= 31.4 && lng >= 113.7 && lng <= 115.1) return '武汉市';
  if (lat >= 31.2 && lat <= 32.6 && lng >= 118.3 && lng <= 119.3) return '南京市';
  if (lat >= 28.1 && lat <= 32.2 && lng >= 105.2 && lng <= 110.2) return '重庆市';
  if (lat >= 33.7 && lat <= 34.8 && lng >= 107.7 && lng <= 109.8) return '西安市';

  return '定位城市';
}
