import { test, expect } from '@playwright/test';

function simulateMicrophone() {
  const capture = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    if (!constraints.audio || constraints.video) return capture(constraints);
    // A generated tone avoids depending on the host's audio hardware in headless Chromium.
    const audio = new AudioContext();
    const source = audio.createOscillator();
    const destination = audio.createMediaStreamDestination();
    source.connect(destination);
    source.start();
    await audio.resume();
    return destination.stream;
  };
}

async function line(page, selector) {
  const box = await page.locator(selector).boundingBox();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4, { steps: 8 });
  await page.mouse.up();
}

async function pixelCount(page, selector) {
  return page.locator(selector).evaluate((canvas) => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let index = 3; index < data.length; index += 4) if (data[index] > 0) count++;
    return count;
  });
}

test('deux artistes : invitation, vidéo, dessins partagés et sortie du salon', async ({ browser, page }) => {
  const errors = [];
  await page.addInitScript(simulateMicrophone);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#connection-status')).toContainText('En attendant');
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Inviter un ami', exact: true }).click();
  const invitation = await page.evaluate(() => navigator.clipboard.readText());
  expect(invitation).toContain(page.url());
  expect(invitation).toMatch(/Code du salon : [A-Z0-9]{8}/);
  const guestContext = await browser.newContext({
    permissions: ['camera', 'microphone'],
    viewport: { width: 1280, height: 1000 },
  });
  const guest = await guestContext.newPage();
  await guest.addInitScript(simulateMicrophone);
  guest.on('pageerror', (error) => errors.push(error.message));
  await guest.goto(page.url(), { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#connection-status')).toContainText('À deux');
  await expect(guest.locator('#connection-status')).toContainText('À deux');
  const localTools = page.locator('[data-toolbar="local"]');
  const remoteTools = page.locator('[data-toolbar="remote"]');
  await localTools.getByRole('button', { name: 'Rose', exact: true }).click();
  await expect(remoteTools.getByRole('button', { name: 'Charbon', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await line(page, '#local-canvas');
  await expect.poll(() => pixelCount(guest, '#remote-canvas')).toBeGreaterThan(100);
  await localTools.getByRole('button', { name: 'Annuler mon dernier trait', exact: true }).click();
  await expect.poll(() => pixelCount(guest, '#remote-canvas')).toBe(0);
  await line(page, '#remote-canvas');
  await expect.poll(() => pixelCount(guest, '#local-canvas')).toBeGreaterThan(100);
  await remoteTools.getByRole('button', { name: 'Effacer cette toile', exact: true }).click();
  await page.locator('#confirm-ok').click();
  await expect.poll(() => pixelCount(guest, '#local-canvas')).toBe(0);
  await page.getByRole('button', { name: 'Activer ma caméra', exact: true }).click();
  await guest.getByRole('button', { name: 'Activer ma caméra', exact: true }).click();
  await expect.poll(() => page.locator('#remote-video').evaluate((video) => video.videoWidth), { timeout: 20000 }).toBeGreaterThan(0);
  await expect.poll(() => guest.locator('#remote-video').evaluate((video) => video.videoWidth), { timeout: 10000 }).toBeGreaterThan(0);
  await expect(page.locator('#remote-video')).toHaveClass('active');
  await page.bringToFront();
  await page.getByRole('button', { name: 'Activer le micro', exact: true }).click();
  await expect(page.locator('#toggle-mic')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => guest.locator('#remote-video').evaluate((video) => video.srcObject?.getAudioTracks().length)).toBe(1);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Capturer le duo', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/^duo-.*\.png$/);
  await guest.getByRole('button', { name: 'Quitter le salon', exact: true }).click();
  await guest.locator('#confirm-ok').click();
  await expect(page.locator('#connection-status')).toContainText('En attendant');
  await expect(guest.locator('#connection-status')).toContainText('Salon quitté');
  expect(errors).toEqual([]);
  await guestContext.close();
});

test('interface mobile : vidéos côte à côte, outils indépendants, pas de débordement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#connection-status')).toContainText('En attendant');
  const left = await page.locator('#local-card').boundingBox();
  const right = await page.locator('#remote-card').boundingBox();
  expect(left.y).toBe(right.y);
  expect(right.x).toBeGreaterThan(left.x + left.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await expect(page.locator('[data-toolbar="local"] [type="range"]')).toBeVisible();
  await expect(page.locator('[data-toolbar="remote"] [type="range"]')).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});

test('code invalide et salon complet : erreurs explicites', async ({ browser, page }) => {
  await page.goto('/?salon=invalid', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#join-dialog')).toBeVisible();
  await expect(page.locator('#join-error')).toContainText('valide');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#connection-status')).toContainText('En attendant');
  const second = await browser.newPage();
  await second.goto(page.url(), { waitUntil: 'domcontentloaded' });
  await expect(second.locator('#connection-status')).toContainText('À deux');
  const third = await browser.newPage();
  await third.goto(page.url(), { waitUntil: 'domcontentloaded' });
  await expect(third.locator('#connection-status')).toContainText('Salon indisponible');
  await expect(third.locator('#toast')).toContainText('deux artistes');
  await second.close();
  await third.close();
});

test('rejoint un salon à partir de l’invitation complète copiée', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#connection-status')).toContainText('En attendant');
  await page.getByRole('button', { name: 'Rejoindre un salon', exact: true }).click();
  await page.locator('#invite-input').fill('Viens dessiner avec moi sur duo. !\nhttps://creative-day.pages.dktapp.cloud/?salon=INVITE42\nCode du salon : INVITE42');
  await page.locator('#join-form').getByRole('button', { name: 'Rejoindre le salon' }).click();
  await expect(page).toHaveURL(/salon=INVITE42/);
  await expect(page.locator('#connection-status')).toContainText('En attendant');
});

test('un refus caméra est expliqué sans bloquer les crayons', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Refus simulé', 'NotAllowedError'));
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#connection-status')).toContainText('En attendant');
  await page.getByRole('button', { name: 'Activer ma caméra', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('Accès refusé');
  await expect(page.locator('#toggle-camera')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#start-camera')).toBeEnabled();
  await line(page, '#local-canvas');
  expect(await pixelCount(page, '#local-canvas')).toBeGreaterThan(100);
});
