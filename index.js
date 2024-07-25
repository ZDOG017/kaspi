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

  // Wait for the product cards to be visible
  await page.waitForSelector('.item-card', { timeout: 30000 });

  // Extract product data
  const products = await page.evaluate(() => {
    const productElements = document.querySelectorAll('.item-card');
    const productData = [];

    productElements.forEach(product => {
      const id = product.getAttribute('data-product-id');
      const titleElement = product.querySelector('.item-card__name a');
      const priceElement = product.querySelector('.item-card__prices .item-card__prices-price');
      const ratingElement = product.querySelector('.item-card__rating .rating');
      const reviewsElement = product.querySelector('.item-card__rating a');
      const shopLinkElement = product.querySelector('.item-card__image-wrapper');

      const title = titleElement ? titleElement.innerText : 'N/A';
      const price = priceElement ? priceElement.innerText : 'N/A';
      const rating = ratingElement ? ratingElement.className.match(/_([0-9]+)/)[1] : 'N/A';
      const reviewsQuantity = reviewsElement ? reviewsElement.innerText.match(/\((\d+) отзыв/)[1] : 'N/A';
      const shopLink = shopLinkElement ? shopLinkElement.href : 'N/A';

      productData.push({
        id,
        title,
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
    console.log(`Price: ${product.price}`);
    console.log(`Rating: ${product.rating}`);
    console.log(`Reviews: ${product.reviewsQuantity}`);
    console.log(`Link: ${product.shopLink}`);
    console.log('-----------------------');
  });

  // Close the browser
  await browser.close();
})();
