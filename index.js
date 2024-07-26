const puppeteer = require('puppeteer');
const fs = require('fs');
const util = require('util');
const sleep = util.promisify(setTimeout);
const stringSimilarity = require('string-similarity');

const componentNames = [
  "NZXT H510",
  "NZXT H510 Elite",
  "NZXT H710",
  "Corsair 4000D Airflow",
  "Corsair 5000D Airflow",
  "Corsair iCUE 220T RGB",
  "Corsair Crystal Series 680X RGB",
  "Fractal Design Meshify C",
  "Fractal Design Define R6",
  "Fractal Design Define 7",
  "Phanteks Eclipse P400A",
  "Phanteks Enthoo Pro 2",
  "Phanteks Evolv X",
  "Cooler Master MasterBox NR600",
  "Cooler Master MasterBox Q300L",
  "Cooler Master MasterCase H500",
  "Cooler Master Cosmos C700P",
  "Lian Li PC-O11 Dynamic",
  "Lian Li Lancool II Mesh",
  "Lian Li Lancool 215",
  "be quiet! Dark Base Pro 900",
  "be quiet! Pure Base 500DX",
  "Thermaltake Core P3",
  "Thermaltake Level 20 MT ARGB",
  "Thermaltake S300 TG Snow Edition",
  "SilverStone Redline RL06",
  "SilverStone FARA R1",
  "SilverStone Seta A1",
  "Antec NX410",
  "Antec P82 Flow",
  "Antec DF600 FLUX",
  "BitFenix Nova Mesh TG",
  "BitFenix Enso Mesh",
  "BitFenix Prodigy M",
  "InWin 101C",
  "InWin 303",
  "InWin A1 Plus",
  "DeepCool Matrexx 55 V3 ADD-RGB 3F",
  "DeepCool CL500",
  "DeepCool Macube 310P",
  "Rosewill Cullinan MX",
  "Rosewill Prism S500",
  "Rosewill Thor V2",
  "Cougar Panzer Max",
  "Cougar MX330-G",
  "Cougar Gemini T",
  "Cooler Master HAF XB EVO",
  "Cooler Master Silencio S600",
  "Thermaltake V200 TG RGB",
  "Thermaltake Versa H18"
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
