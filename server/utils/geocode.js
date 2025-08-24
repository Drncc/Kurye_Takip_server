const { nominatimBase } = require('../config/env');

// Use global fetch if available (Node 18+), otherwise lazy-load node-fetch
async function fetchFn(url, options) {
  if (typeof fetch === 'function') {
    return fetch(url, options);
  }
  const mod = await import('node-fetch');
  return mod.default(url, options);
}

async function geocodeAddressToPoint(addressText) {
  try {
    // Daha detaylı arama için adres formatını iyileştir
    const searchQuery = `${addressText}, Alanya, Antalya, Turkey`;
    const url = `${nominatimBase}/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=3&countrycodes=tr&addressdetails=1&viewbox=31.5,36.3,32.5,36.8`;
    
    const res = await fetchFn(url, { 
      headers: { 'User-Agent': 'DeliveryPro/1.0 (ddirenc5@gmail.com)' } 
    });
    
    if (!res.ok) {
      console.log('Geocoding API hatası:', res.status);
      return null; // Hata durumunda null döndür
    }
    
    const data = await res.json();
    
    if (!data.length) {
      console.log('Adres bulunamadı:', searchQuery);
      return null; // Adres bulunamadığında null döndür
    }
    
    // En iyi eşleşmeyi bul
    const bestMatch = data.find(item => {
      const displayName = item.display_name.toLowerCase();
      return displayName.includes('alanya') || displayName.includes('antalya');
    }) || data[0];
    
    const { lon, lat, display_name } = bestMatch;
    
    console.log('Bulunan adres:', display_name, 'Koordinatlar:', lon, lat);
    
    return { 
      type: 'Point', 
      coordinates: [Number(lon), Number(lat)] 
    };
    
  } catch (error) {
    console.log('Geocoding hatası:', error.message);
    return null; // Hata durumunda null döndür
  }
}

module.exports = { geocodeAddressToPoint };