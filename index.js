const puppeteer = require('puppeteer');
const fs = require('fs');
const util = require('util');
const sleep = util.promisify(setTimeout);

const componentNames = [
  "AMD Ryzen 5 3600",
  "Gigabyte GeForce GTX 1660 SUPER OC",
  "Asus PRIME B450M-K",
  "Corsair Vengeance LPX 16GB",
  "EVGA 600 W1",
  "Cooler Master Hyper 212",
  "Noctua NF-P12",
  "NZXT H510"
];

const userAgents = [
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15'
];

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const parsedComponents = [];

  for (const componentName of componentNames) {
    console.log(`Processing component: ${componentName}`);
    const url = `https://kaspi.kz/shop/search/?text=${encodeURIComponent(componentName)}&hint_chips_click=false`;

    try {
      const page = await browser.newPage();
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      await page.setUserAgent(randomUserAgent);

      console.log(`Navigating to URL: ${url}`);
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      console.log('Waiting for product cards to load...');
      await page.waitForSelector('.item-card', { timeout: 30000 });

      const products = await page.evaluate(() => {
        const productElements = document.querySelectorAll('.item-card');
        const productData = [];

        productElements.forEach(product => {
          const titleElement = product.querySelector('.item-card__name a');
          const priceElement = product.querySelector('.item-card__prices .item-card__prices-price');
          const ratingElement = product.querySelector('.item-card__rating .rating');
          const reviewsElement = product.querySelector('.item-card__rating a');
          const shopLinkElement = product.querySelector('.item-card__image-wrapper');
          const imageElement = product.querySelector('.item-card__image');

          const title = titleElement ? titleElement.innerText : 'N/A';
          const price = priceElement ? priceElement.innerText.replace(/\D/g, '') : 'N/A';
          const rating = ratingElement ? parseFloat(ratingElement.className.match(/_(\d+)/)[1]) / 10 : 'N/A';
          const reviewCount = reviewsElement ? parseInt(reviewsElement.innerText.replace(/\D/g, '')) : 'N/A';
          const shopLink = shopLinkElement ? shopLinkElement.href : 'N/A';
          const image = imageElement ? imageElement.src : 'N/A';

          productData.push({
            title,
            price,
            url: shopLink,
            image,
            rating,
            reviewCount
          });
        });

        return productData;
      });

      if (products.length > 0) {
        console.log(`Found product: ${products[0].title}`);
        parsedComponents.push(products[0]);  // Add only the first product
      }

      await page.close();
      console.log('Closing page and waiting before next request...');
      await sleep(5000);  // Add a delay between requests to avoid being banned

    } catch (error) {
      console.error(`Error processing ${componentName}:`, error);
    }
  }

  await browser.close();
  console.log('Browser closed.');

  fs.writeFileSync('parsedComponents.json', JSON.stringify({ components: parsedComponents }, null, 2));
  console.log('Parsing completed. Data saved to parsedComponents.json');
})();
