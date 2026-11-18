// Ordered along the drawn line: north to south on the European side, then across the Bosphorus.
// Coordinates are approximate (OpenStreetMap) and only rank stores by distance.
// mx/my place each store on the stylised halftone map (src/halftone.js, 1000 × 520 units).
export const stores = [
  {id:'istinyepark', mx:520, my:150, short:'İstinyePark', name:'İstinyePark AVM', side:'avrupa', street:'Pınar Mah. İstinye Bayırı Cad. No:73', area:'İstinye Park AVM, Sarıyer / İstanbul', open:'10:00', close:'22:00', lat:41.1103, lng:29.0326, maps:'Vodafone+İstinyePark+AVM+Sarıyer+İstanbul'},
  {id:'ozdilekpark', mx:474, my:205, short:'ÖzdilekPark', name:'ÖzdilekPark AVM', side:'avrupa', street:'Esentepe Mah. Dede Korkut Sok. No:15', area:'ÖzdilekPark AVM, Şişli / İstanbul', open:'10:00', close:'22:00', lat:41.0773, lng:29.0110, maps:'Vodafone+ÖzdilekPark+AVM+Esentepe+Şişli+İstanbul'},
  {id:'mecidiyekoy', mx:446, my:262, short:'Mecidiyeköy', name:'Mecidiyeköy Mağaza', side:'avrupa', street:'Büyükdere Cad. Hürmet Keçeli İş Merkezi No:51', area:'Mecidiyeköy, Şişli / İstanbul', open:'09:00', close:'21:00', lat:41.0668, lng:28.9958, maps:'Vodafone+Mecidiyeköy+Büyükdere+Cad+No:51+Şişli+İstanbul'},
  {id:'cevahir', mx:398, my:300, short:'Cevahir', name:'Cevahir AVM', side:'avrupa', street:'19 Mayıs Mah. Büyükdere Cad. No:22 Kat:1', area:'Cevahir AVM, Şişli / İstanbul', open:'10:00', close:'22:00', lat:41.0626, lng:28.9930, maps:'Vodafone+Cevahir+AVM+Büyükdere+Cad+Şişli+İstanbul'},
  {id:'akasya', mx:600, my:372, short:'Akasya', name:'Akasya AVM', side:'anadolu', street:'Acıbadem Mah. Çeçen Sok. No:25', area:'Akasya AVM, Üsküdar / İstanbul', open:'10:00', close:'22:00', lat:41.0016, lng:29.0550, maps:'Vodafone+Akasya+AVM+Acıbadem+Üsküdar+İstanbul'},
  {id:'bagdat', mx:780, my:438, short:'Bağdat Caddesi', name:'Bağdat Caddesi Mağazası', side:'anadolu', street:'Bağdat Cad. No:395/A', area:'Suadiye, Kadıköy / İstanbul', open:'09:00', close:'21:00', lat:40.9626, lng:29.0765, maps:'Vodafone+Bağdat+Caddesi+No:395+Suadiye+Kadıköy+İstanbul'},
];

export const sides = [
  {id:'avrupa', label:'Avrupa Yakası'},
  {id:'anadolu', label:'Anadolu Yakası'},
];

export const contact = {
  phone:'0545 363 64 64',
  phoneHref:'tel:+905453636464',
  email:'info@zanes.com.tr',
  address:['Büyükdere Cad. Hürmet Keçeli İş Merkezi No:51', 'Mecidiyeköy, Şişli / İstanbul'],
};
