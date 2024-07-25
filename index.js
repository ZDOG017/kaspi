const puppeteer = require('puppeteer');

(async () => {
  const url = 'https://kaspi.kz/shop/search/?text=NVIDIA%20GTX%201660%20SUPER&hint_chips_click=false';

  // Launch a new browser instance
  const browser = await puppeteer.launch({
    headless: true, // Set to false if you want to see the browser window
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Open a new page
  const page = await browser.newPage();

  // Set user agent to mimic a real browser
  await page.setUserAgent('Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0');

  // Go to the URL
  await page.goto(url, {
    waitUntil: 'networkidle2', // Wait until the network is idle
  });

  // Extract product data
  const products = await page.evaluate(() => {
    const productElements = document.querySelectorAll('.item-card');
    const productData = [];

    productElements.forEach(product => {
      const id = product.getAttribute('data-id');
      const title = product.querySelector('.item-card__name').innerText;
      const brand = product.querySelector('.item-card__brand').innerText;
      const price = product.querySelector('.item-card__price').innerText;
      const rating = product.querySelector('.item-card__rating-stars').getAttribute('data-rating');
      const reviewsQuantity = product.querySelector('.item-card__reviews').innerText;
      const shopLink = product.querySelector('a').href;

      productData.push({
        id,
        title,
        brand,
        price,
        rating,
        reviewsQuantity,
        shopLink,
      });
    });

    return productData;
  });

  // Log the extracted product data
  products.forEach(product => {
    console.log(`Product ID: ${product.id}`);
    console.log(`Title: ${product.title}`);
    console.log(`Brand: ${product.brand}`);
    console.log(`Price: ${product.price}`);
    console.log(`Rating: ${product.rating}`);
    console.log(`Reviews: ${product.reviewsQuantity}`);
    console.log(`Link: ${product.shopLink}`);
    console.log('-----------------------');
  });

  // Close the browser
  await browser.close();
})();
