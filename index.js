const puppeteer = require('puppeteer');
const fs = require('fs');
const util = require('util');
const sleep = util.promisify(setTimeout);
const stringSimilarity = require('string-similarity');

const componentNames = [
  "NVIDIA GeForce RTX 4090",
  "NVIDIA GeForce RTX 4080",
  "NVIDIA GeForce RTX 4070 Ti",
  "NVIDIA GeForce RTX 4070",
  "NVIDIA GeForce RTX 4060 Ti",
  "NVIDIA GeForce RTX 4060",
  "NVIDIA GeForce RTX 3090 Ti",
  "NVIDIA GeForce RTX 3090",
  "NVIDIA GeForce RTX 3080 Ti",
  "NVIDIA GeForce RTX 3080",
  "NVIDIA GeForce RTX 3070 Ti",
  "NVIDIA GeForce RTX 3070",
  "NVIDIA GeForce RTX 3060 Ti",
  "NVIDIA GeForce RTX 3060",
  "NVIDIA GeForce RTX 3050",
  "AMD Radeon RX 7900 XTX",
  "AMD Radeon RX 7900 XT",
  "AMD Radeon RX 7800 XT",
  "AMD Radeon RX 7700 XT",
  "AMD Radeon RX 7600",
  "AMD Radeon RX 6950 XT",
  "AMD Radeon RX 6900 XT",
  "AMD Radeon RX 6800 XT",
  "AMD Radeon RX 6800",
  "AMD Radeon RX 6700 XT",
  "AMD Radeon RX 6600 XT",
  "AMD Radeon RX 6600",
  "AMD Radeon RX 6500 XT",
  "NVIDIA GeForce GTX 1660 Ti",
  "NVIDIA GeForce GTX 1660 Super",
  "NVIDIA GeForce GTX 1660",
  "NVIDIA GeForce GTX 1650 Super",
  "NVIDIA GeForce GTX 1650",
  "NVIDIA GeForce GTX 1050 Ti",
  "NVIDIA GeForce GTX 1050",
  "AMD Radeon RX 580",
  "AMD Radeon RX 570",
  "AMD Radeon RX 560",
  "AMD Radeon RX 550",
  "NVIDIA GeForce GTX 1080 Ti",
  "NVIDIA GeForce GTX 1080",
  "NVIDIA GeForce GTX 1070 Ti",
  "NVIDIA GeForce GTX 1070",
  "NVIDIA GeForce GTX 1060 6GB",
  "NVIDIA GeForce GTX 1060 3GB",
  "NVIDIA GeForce GTX 1050 3GB",
  "AMD Radeon RX 480",
  "AMD Radeon RX 470",
  "AMD Radeon RX 460",
  "NVIDIA Quadro RTX 4000"
];

const userAgents = [
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15'
];

// Function to load existing JSON data
function loadExistingData(filePath) {
  if (fs.existsSync(filePath)) {
    const rawData = fs.readFileSync(filePath);
    return JSON.parse(rawData);
  }
  return { components: [] };
}

// Function to save new JSON data
function saveData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Function to check if a component already exists
function componentExists(existingComponents, newComponent) {
  return existingComponents.some(component => component.title === newComponent.title);
}

// Function to find the best match for a component name
function findBestMatch(componentName, products) {
  const productNames = products.map(product => product.title);
  const bestMatch = stringSimilarity.findBestMatch(componentName, productNames).bestMatch;
  return products[productNames.indexOf(bestMatch.target)];
}

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const parsedComponents = [];
  const existingData = loadExistingData('parsedComponents.json');
  const existingComponents = existingData.components;

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
          const shopLinkElement = product.querySelector('.item-card__image-wrapper');
          const imageElement = product.querySelector('.item-card__image');

          const title = titleElement ? titleElement.innerText : 'N/A';
          const price = priceElement ? priceElement.innerText.replace(/\D/g, '') : 'N/A';
          const shopLink = shopLinkElement ? shopLinkElement.href : 'N/A';
          const image = imageElement ? imageElement.src : 'N/A';

          productData.push({
            title,
            price,
            url: shopLinkElement ? shopLinkElement.getAttribute('href') : 'N/A',
            image
          });
        });

        return productData;
      });

      if (products.length > 0) {
        const bestMatchProduct = findBestMatch(componentName, products);
        if (!componentExists(existingComponents, bestMatchProduct)) {
          console.log(`Found new product: ${bestMatchProduct.title}`);
          parsedComponents.push(bestMatchProduct);
        } else {
          console.log(`Product already exists: ${bestMatchProduct.title}`);
        }
      }

      await page.close();
      console.log('Closing page and waiting before next request...');
      await sleep(1000);  // Add a delay between requests to avoid being banned

    } catch (error) {
      console.error(`Error processing ${componentName}:`, error);
    }
  }

  await browser.close();
  console.log('Browser closed.');

  // Append new components to existing components
  const updatedComponents = existingComponents.concat(parsedComponents);
  saveData('parsedComponents.json', { components: updatedComponents });

  console.log('Parsing completed. Data saved to parsedComponents.json');
})();
