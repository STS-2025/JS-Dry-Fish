import { productsData } from './products';

export const shopInfo = {
  name: 'JS Dry Fish Shop',
  phone: '9787453202',
  whatsapp: '8925151252',
  upiId: '9787453202@okaxis',
  address: 'Thoothukudi',
  facebookUrl: 'https://www.facebook.com/அந்தோணி-கருவாடு-கடை-110080637409919/'
};

export const shopOfferings = productsData.map(product => ({
  id: product.id,
  label: `${product.nameTa} (${product.packSize})`
}));
