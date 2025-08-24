const { nominatimBase } = require('../config/env');

// Use global fetch if available (Node 18+), otherwise lazy-load node-fetch
async function fetchFn(url, options) {
  if (typeof fetch === 'function') {
    return fetch(url, options);
  }
  const mod = await import('node-fetch');
  return mod.default(url, options);
}

// Alanya semtleri ve merkez koordinatları
const ALANYA_DISTRICTS = {
  'mahmutlar': { lng: 32.0867, lat: 36.5722, name: 'Mahmutlar' },
  'tosmur': { lng: 32.0167, lat: 36.5667, name: 'Tosmur' },
  'okey': { lng: 31.9957, lat: 36.5441, name: 'Okey' },
  'hacet': { lng: 31.9857, lat: 36.5341, name: 'Hacet' },
  'kale': { lng: 31.9957, lat: 36.5441, name: 'Kale' },
  'kleopatra': { lng: 31.9957, lat: 36.5441, name: 'Kleopatra' },
  'damlataş': { lng: 31.9957, lat: 36.5441, name: 'Damlataş' },
  'güllerpınarı': { lng: 32.0167, lat: 36.5667, name: 'Güllerpınarı' },
  'çayyolu': { lng: 32.0167, lat: 36.5667, name: 'Çayyolu' },
  'kestel': { lng: 31.9857, lat: 36.5341, name: 'Kestel' },
  'obaköy': { lng: 32.0867, lat: 36.5722, name: 'Oba Köyü' },
  'konakli': { lng: 32.0867, lat: 36.5722, name: 'Konaklı' },
  'avsallar': { lng: 32.0867, lat: 36.5722, name: 'Avsallar' },
  'incekum': { lng: 32.0867, lat: 36.5722, name: 'İncekum' }
};

// Semt adını normalize et
function normalizeDistrict(district) {
  if (!district) return null;
  
  const normalized = district.toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
  
  return normalized;
}

// Semt koordinatlarını bul
function getDistrictCoordinates(district) {
  const normalized = normalizeDistrict(district);
  
  for (const [key, value] of Object.entries(ALANYA_DISTRICTS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Eşleşme bulunamazsa Okey (merkez) koordinatlarını döndür
  return ALANYA_DISTRICTS.okey;
}

async function geocodeAddressToPoint(addressText, district = null) {
  try {
    let searchQuery, viewbox;
    
    if (district) {
      // Semt bazlı arama
      const districtCoords = getDistrictCoordinates(district);
      console.log(`Semt bulundu: ${districtCoords.name} (${districtCoords.lng}, ${districtCoords.lat})`);
      
      // Semt merkezi etrafında 2km'lik alan
      const radius = 0.02; // ~2km
      viewbox = `${districtCoords.lng - radius},${districtCoords.lat - radius},${districtCoords.lng + radius},${districtCoords.lat + radius}`;
      
      searchQuery = `${addressText}, ${districtCoords.name}, Alanya, Antalya, Turkey`;
    } else {
      // Genel Alanya araması
      viewbox = '31.5,36.3,32.5,36.8';
      searchQuery = `${addressText}, Alanya, Antalya, Turkey`;
    }
    
    const url = `${nominatimBase}/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=tr&addressdetails=1&viewbox=${viewbox}`;
    
    console.log('Geocoding URL:', url);
    
    const res = await fetchFn(url, { 
      headers: { 'User-Agent': 'DeliveryPro/1.0 (ddirenc5@gmail.com)' } 
    });
    
    if (!res.ok) {
      console.log('Geocoding API hatası:', res.status);
      return null;
    }
    
    const data = await res.json();
    
    if (!data.length) {
      console.log('Adres bulunamadı:', searchQuery);
      return null;
    }
    
    // Semt bazlı aramada en yakın sonucu seç
    let bestMatch = data[0];
    
    if (district) {
      const districtCoords = getDistrictCoordinates(district);
      
      // En yakın koordinatları bul
      let minDistance = Infinity;
      for (const item of data) {
        const distance = Math.sqrt(
          Math.pow(item.lon - districtCoords.lng, 2) + 
          Math.pow(item.lat - districtCoords.lat, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = item;
        }
      }
    }
    
    const { lon, lat, display_name } = bestMatch;
    
    console.log('Bulunan adres:', display_name);
    console.log('Koordinatlar:', lon, lat);
    console.log('Semt:', district);
    
    return { 
      type: 'Point', 
      coordinates: [Number(lon), Number(lat)] 
    };
    
  } catch (error) {
    console.log('Geocoding hatası:', error.message);
    return null;
  }
}

// Semt listesini döndür
function getAvailableDistricts() {
  return Object.values(ALANYA_DISTRICTS).map(d => ({
    key: d.name.toLowerCase().replace(/\s+/g, ''),
    name: d.name,
    coordinates: { lng: d.lng, lat: d.lat }
  }));
}

module.exports = { 
  geocodeAddressToPoint, 
  getAvailableDistricts,
  getDistrictCoordinates 
};

module.exports = { geocodeAddressToPoint };
module.exports = { geocodeAddressToPoint };