const axios = require('axios');

const url = 'https://kaspi.kz/yml/product-view/pl/filters?text=NVIDIA+GTX+1660+SUPER&hint_chips_click=false&page=0&all=false&fl=true&ui=d&q=%3AavailableInZones%3AMagnum_ZONE1&i=-1&c=750000000';
const headers = {
  'Accept': 'application/json, text/*',
  'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Accept-Language': 'en-US,en;q=0.5',
  'X-KS-City': '750000000',
  'Referer': 'https://kaspi.kz/shop/search/?text=NVIDIA%20GTX%201660%20SUPER&hint_chips_click=false',
  'Cookie': 'ks.tg=71; k_stat=aa96833e-dac6-4558-a423-eacb2f0e53e4; kaspi.storefront.cookie.city=750000000; current-action-name=Index',
  'Connection': 'keep-alive',
  'Accept-Encoding': 'gzip, compress, deflate, br'
};

const fetchData = async (retryCount = 0) => {
  try {
    const response = await axios.get(url, { headers, maxRedirects: 5 });
    if (response.data && response.data.data && response.data.data.cards) {
      const data = response.data.data.cards; // Extract the array of products
      data.forEach(product => {
        console.log(`Product ID: ${product.id}`);
        console.log(`Title: ${product.title}`);
        console.log(`Brand: ${product.brand}`);
        console.log(`Price: ${product.priceFormatted}`);
        console.log(`Rating: ${product.rating}`);
        console.log(`Reviews: ${product.reviewsQuantity}`);
        console.log(`Link: ${product.shopLink}`);
        console.log('Images:');
        product.previewImages.forEach(image => {
          console.log(`- Small: ${image.small}`);
          console.log(`- Medium: ${image.medium}`);
          console.log(`- Large: ${image.large}`);
        });
        console.log('-----------------------');
      });
    } else {
      console.error('Unexpected response structure:', response.data);
    }
  } catch (error) {
    if (error.response && error.response.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '1', 10);
      const delay = Math.min(retryAfter * 1000, Math.pow(2, retryCount) * 1000);
      console.warn(`Rate limit exceeded. Retrying after ${delay / 1000} seconds...`);
      if (retryCount < 5) {
        setTimeout(() => fetchData(retryCount + 1), delay);
      } else {
        console.error('Max retries reached. Please try again later.');
      }
    } else {
      console.error('Error fetching data:', error.message);
    }
  }
};

fetchData();
