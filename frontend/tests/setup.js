// Setup per i test del frontend
const puppeteer = require('puppeteer');

// Configurazione globale per i test
global.BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3002';
global.TEST_TIMEOUT = 30000;

// Funzione helper per creare una nuova istanza del browser
global.createBrowser = async () => {
  return await puppeteer.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: 100,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
};

// Funzione helper per creare una nuova pagina
global.createPage = async (browser) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  return page;
};

// Funzione helper per attendere che un elemento sia visibile
global.waitForElement = async (page, selector, timeout = 5000) => {
  await page.waitForSelector(selector, { visible: true, timeout });
};

// Funzione helper per fare click su un elemento
global.clickElement = async (page, selector) => {
  await page.waitForSelector(selector);
  await page.click(selector);
};

// Funzione helper per inserire testo in un input
global.typeText = async (page, selector, text) => {
  await page.waitForSelector(selector);
  await page.type(selector, text);
};

// Funzione helper per verificare che un elemento contenga un testo
global.expectText = async (page, selector, expectedText) => {
  await page.waitForSelector(selector);
  const text = await page.$eval(selector, el => el.textContent);
  expect(text).toContain(expectedText);
};

console.log('🧪 Setup test frontend completato');
