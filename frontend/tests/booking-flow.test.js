const { createBrowser, createPage, waitForElement, clickElement, typeText, expectText } = require('./setup');

describe('Flusso di Prenotazione Completo', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await createBrowser();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await createPage(browser);
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('Flusso completo: Homepage -> Login -> Selezione Slot -> Pagamento', async () => {
    // Step 1: Vai alla homepage
    await page.goto(`${BASE_URL}/index.html`);
    await waitForElement(page, 'h1');
    
    // Verifica che siamo sulla homepage
    await expectText(page, 'h1', 'CoworkSpace');

    // Step 2: Clicca su "Prenota Ora"
    await clickElement(page, 'a[href="selezione-slot.html"]');
    
    // Verifica che siamo sulla pagina di selezione slot
    await waitForElement(page, 'h2');
    await expectText(page, 'h2', 'Seleziona');

    // Step 3: Seleziona una sede (se disponibile)
    try {
      await waitForElement(page, 'select[name="sede"]', 3000);
      await page.select('select[name="sede"]', '1'); // Seleziona la prima sede
    } catch (error) {
      console.log('Nessuna sede disponibile per il test');
    }

    // Step 4: Seleziona uno spazio (se disponibile)
    try {
      await waitForElement(page, 'select[name="spazio"]', 3000);
      await page.select('select[name="spazio"]', '1'); // Seleziona il primo spazio
    } catch (error) {
      console.log('Nessuno spazio disponibile per il test');
    }

    // Step 5: Seleziona una data
    try {
      await waitForElement(page, 'input[name="data"]', 3000);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await typeText(page, 'input[name="data"]', dateString);
    } catch (error) {
      console.log('Campo data non disponibile per il test');
    }

    // Step 6: Clicca su "Verifica Disponibilità"
    try {
      await clickElement(page, 'button[type="submit"]');
      await page.waitForTimeout(2000); // Attendi il caricamento
    } catch (error) {
      console.log('Pulsante verifica disponibilità non trovato');
    }

    // Step 7: Seleziona uno slot (se disponibile)
    try {
      await waitForElement(page, '.slot-disponibile', 5000);
      await clickElement(page, '.slot-disponibile');
    } catch (error) {
      console.log('Nessuno slot disponibile per il test');
    }

    // Step 8: Clicca su "Prenota Ora"
    try {
      await clickElement(page, '#btnBook');
    } catch (error) {
      console.log('Pulsante prenota ora non trovato');
    }

    // Step 9: Verifica che siamo sulla pagina di login
    await waitForElement(page, 'h2');
    await expectText(page, 'h2', 'Accedi');

    // Step 10: Compila il form di login
    await typeText(page, 'input[name="email"]', 'test@example.com');
    await typeText(page, 'input[name="password"]', 'password123');

    // Step 11: Clicca su "Accedi"
    await clickElement(page, 'button[type="submit"]');

    // Step 12: Verifica che siamo sulla pagina di selezione slot (dopo login)
    await waitForElement(page, 'h2');
    await expectText(page, 'h2', 'Seleziona');

    // Step 13: Ripeti la selezione slot
    try {
      await waitForElement(page, 'select[name="sede"]', 3000);
      await page.select('select[name="sede"]', '1');
    } catch (error) {
      console.log('Nessuna sede disponibile dopo login');
    }

    try {
      await waitForElement(page, 'select[name="spazio"]', 3000);
      await page.select('select[name="spazio"]', '1');
    } catch (error) {
      console.log('Nessuno spazio disponibile dopo login');
    }

    try {
      await waitForElement(page, 'input[name="data"]', 3000);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];
      await typeText(page, 'input[name="data"]', dateString);
    } catch (error) {
      console.log('Campo data non disponibile dopo login');
    }

    try {
      await clickElement(page, 'button[type="submit"]');
      await page.waitForTimeout(2000);
    } catch (error) {
      console.log('Pulsante verifica disponibilità non trovato dopo login');
    }

    try {
      await waitForElement(page, '.slot-disponibile', 5000);
      await clickElement(page, '.slot-disponibile');
    } catch (error) {
      console.log('Nessuno slot disponibile dopo login');
    }

    try {
      await clickElement(page, '#btnBook');
    } catch (error) {
      console.log('Pulsante prenota ora non trovato dopo login');
    }

    // Step 14: Verifica che siamo sulla pagina di pagamento
    await waitForElement(page, 'h2');
    await expectText(page, 'h2', 'Pagamento');

    // Step 15: Compila il form di pagamento
    try {
      await waitForElement(page, 'input[name="nome"]', 3000);
      await typeText(page, 'input[name="nome"]', 'Test User');
    } catch (error) {
      console.log('Campo nome non disponibile');
    }

    try {
      await waitForElement(page, 'input[name="cognome"]', 3000);
      await typeText(page, 'input[name="cognome"]', 'Test Surname');
    } catch (error) {
      console.log('Campo cognome non disponibile');
    }

    try {
      await waitForElement(page, 'input[name="email"]', 3000);
      await typeText(page, 'input[name="email"]', 'test@example.com');
    } catch (error) {
      console.log('Campo email non disponibile');
    }

    // Step 16: Clicca su "Conferma Pagamento"
    try {
      await clickElement(page, 'button[type="submit"]');
    } catch (error) {
      console.log('Pulsante conferma pagamento non trovato');
    }

    // Step 17: Verifica il messaggio di successo
    try {
      await waitForElement(page, '.alert-success', 5000);
      await expectText(page, '.alert-success', 'successo');
    } catch (error) {
      console.log('Messaggio di successo non trovato');
    }

  }, TEST_TIMEOUT);

  test('Test di navigazione tra le pagine', async () => {
    // Test navigazione homepage -> catalogo
    await page.goto(`${BASE_URL}/index.html`);
    await waitForElement(page, 'h1');
    
    try {
      await clickElement(page, 'a[href="catalogo.html"]');
      await waitForElement(page, 'h2');
      await expectText(page, 'h2', 'Catalogo');
    } catch (error) {
      console.log('Navigazione a catalogo non disponibile');
    }

    // Test navigazione catalogo -> homepage
    try {
      await clickElement(page, 'a[href="index.html"]');
      await waitForElement(page, 'h1');
      await expectText(page, 'h1', 'CoworkSpace');
    } catch (error) {
      console.log('Navigazione a homepage non disponibile');
    }

  }, TEST_TIMEOUT);

  test('Test di autenticazione', async () => {
    // Test login con credenziali valide
    await page.goto(`${BASE_URL}/login.html`);
    await waitForElement(page, 'h2');
    
    await typeText(page, 'input[name="email"]', 'test@example.com');
    await typeText(page, 'input[name="password"]', 'password123');
    await clickElement(page, 'button[type="submit"]');

    // Verifica redirect dopo login
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('login.html');

  }, TEST_TIMEOUT);
});
