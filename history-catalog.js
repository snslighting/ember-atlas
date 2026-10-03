export const historyCases={
 uzbekistan:{id:'uzbekistan',name:'Uzbekistan',subtitle:'2000 onward · Standard Processing with provisional NRT appended',bounds:[55.9,37.1,73.2,45.6],country:'Uzbekistan',startYear:2000,endYear:2026,defaultMonth:'2024-08'},
 california:{id:'california',name:'Northern California',subtitle:'September case study · 2017–2024',bounds:[-123,38,-120,41],month:9,startYear:2017,endYear:2024,defaultMonth:'2020-09'},
 amazon:{id:'amazon',name:'Amazon · Rondônia',subtitle:'August case study · 2017–2024',bounds:[-64,-13,-60,-8],month:8,startYear:2017,endYear:2024,defaultMonth:'2019-08'}
};
export const historyProducts={
 MODIS_NRT:{sensor:'MODIS',slot:'m',satellite:'Terra / Aqua',start:'2000-11-01',processing:'NRT'},
 VIIRS_SNPP_NRT:{sensor:'VIIRS',slot:'s',satellite:'Suomi-NPP',start:'2012-01-20',processing:'NRT'},
 VIIRS_NOAA20_NRT:{sensor:'VIIRS',slot:'j',satellite:'NOAA-20',start:'2018-04-01',processing:'NRT'},
 MODIS_SP:{sensor:'MODIS',slot:'m',satellite:'Terra / Aqua',start:'2000-11-01',countryProduct:'modis'},
 VIIRS_SNPP_SP:{sensor:'VIIRS',slot:'s',satellite:'Suomi-NPP',start:'2012-01-20',countryProduct:'viirs-snpp'},
 VIIRS_NOAA20_SP:{sensor:'VIIRS',slot:'j',satellite:'NOAA-20',start:'2018-04-01',countryProduct:'viirs-jpss1'},
 VIIRS_NOAA21_NRT:{sensor:'VIIRS',slot:'n',satellite:'NOAA-21',start:'2024-01-17',processing:'NRT'}
};
export const historyQuality={MODIS:40,VIIRS:70,description:'MODIS confidence at least 40 (native scale); VIIRS nominal/high only. Categories are not probabilities.'};
export const historyColumns=['date','lat','lon','m','s','j','n','frp','confidence','timeStart','timeEnd','satellites','products','cellID','contributions'];
export const historySources={archive:'https://firms.modaps.eosdis.nasa.gov/country/',api:'https://firms.modaps.eosdis.nasa.gov/api/area/',availability:'https://firms.modaps.eosdis.nasa.gov/api/data_availability/'};
