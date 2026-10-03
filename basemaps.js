const gibs='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/';
const nasa='Imagery © <a href="https://www.earthdata.nasa.gov/engage/open-data-services-and-software/earthdata-developer-portal/gibs-api">NASA GIBS</a>';
const mapTiles='© <a href="https://openfreemap.org/">OpenFreeMap</a> · © <a href="https://openmaptiles.org/">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const basemaps={
 street:{label:'Street map · English',vector:true,attribution:mapTiles,note:'OpenFreeMap roads and places. English labels with Latin transliterations where translations are unavailable.'},
 dark:{label:'Dark map · English',vector:true,attribution:mapTiles,note:'OpenFreeMap dark roads and places. English labels with Latin transliterations where translations are unavailable.'},
 
 satellite:{label:'Satellite · Sentinel-2 2025',url:'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',maxNativeZoom:14,attribution:'<a href="https://maps.eox.at/">EOX::Maps</a> · <a href="https://s2maps.eu/">Sentinel-2 cloudless</a> by EOX IT Services GmbH · Contains modified Copernicus Sentinel data 2025 · <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>',note:'Cloudless 2025 Sentinel-2 imagery by EOX, with 10 m source detail. Tiles load for the visible area as you zoom. For finer roads and buildings, choose Street map. This background is a composite, independent of live NASA detections.'},
 'blue-marble':{label:'Satellite · NASA Blue Marble',url:gibs+'BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg',maxNativeZoom:8,attribution:nasa,note:'NASA Blue Marble composite with relief and bathymetry. Static background, not live imagery.'},
 night:{label:'Night lights · VIIRS 2012',url:gibs+'VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg',maxNativeZoom:8,attribution:nasa,note:'NASA VIIRS nighttime lights composite from 2012. Static imagery; hotspot observations update separately.'},
 daily:{label:'Satellite · daily MODIS',url:gibs+'MODIS_Terra_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg',maxNativeZoom:9,attribution:nasa,note:'NASA MODIS Terra daily true-color imagery. Clouds and unobserved areas may obscure the surface; imagery dates differ from hotspot acquisition dates.'}
};
export function imageryDate(dateEnd,selectedDay){return selectedDay||new Date(Date.parse(dateEnd+'T00:00:00Z')-86400000).toISOString().slice(0,10);}
