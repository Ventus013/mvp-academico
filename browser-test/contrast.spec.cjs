const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

async function expectReadable(locator) {
  const ratio = await locator.evaluate(node => {
    function luminance(color) {
      const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }
    const foreground = luminance(getComputedStyle(node).color);
    let backgroundNode = node;
    while (getComputedStyle(backgroundNode).backgroundColor === 'rgba(0, 0, 0, 0)') {
      backgroundNode = backgroundNode.parentElement;
    }
    const background = luminance(getComputedStyle(backgroundNode).backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(ratio, `Contraste de ${locator}`).toBeGreaterThanOrEqual(7);
}

test('alto contraste alterna por teclado e preserva a preferência ao recarregar', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('#contrast-toggle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const originalBackground = await page.locator('.panel').first().evaluate(node => getComputedStyle(node).backgroundColor);
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveClass('high-contrast');
  await expectReadable(toggle);
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.panel').first()).toHaveCSS('background-color', originalBackground);
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('cadastros, erros, tabelas, associações e diálogo permanecem legíveis em alto contraste', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#product-count')).not.toHaveText('—');
  await page.locator('#contrast-toggle').click();
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).click();
  await expect(page.locator('#product-sku-error')).toBeVisible();
  for (const selector of ['#page-title', '#page-description', '.muted', '.optional', '.stats small', '.stat-tip span', '.stat-tip p', 'label[for="product-name"]', '#product-sku', '#product-name', '#product-description', '#product-sku-error', '#notice', '.nav-button.active', '#product-form .primary', '#products-view th']) {
    await expectReadable(page.locator(selector).first());
  }
  await page.locator('#product-sku').fill('CONTRAST-CUBE');
  await page.locator('#product-name').fill('Cubo acessível');
  await page.locator('#product-description').fill('Descrição legível');
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).click();
  const product = page.locator('#product-rows tr').filter({ hasText: 'CONTRAST-CUBE' });
  await expect(product).toBeVisible();
  for (const selector of ['strong', 'small', 'code', '.text-button']) await expectReadable(product.locator(selector).first());
  await page.locator('[data-view="processes"]').click();
  await page.locator('#process-code').fill('CONTRAST-REVIEW');
  await page.locator('#process-name').fill('Revisão acessível');
  await page.getByRole('button', { name: 'Salvar processo', exact: true }).click();
  await expect(page.locator('#process-rows')).toContainText('CONTRAST-REVIEW');
  await expectReadable(page.locator('#process-name'));
  await page.locator('[data-view="associations"]').click();
  await page.locator('#association-product').selectOption({ label: 'CONTRAST-CUBE · Cubo acessível' });
  await page.locator('#association-process').selectOption({ label: 'CONTRAST-REVIEW · Revisão acessível' });
  await page.getByRole('button', { name: 'Associar processo', exact: true }).click();
  await expect(page.locator('#association-rows')).toContainText('Revisão acessível');
  for (const selector of ['#association-product', '#association-position', '.step-info strong', '.step-number']) await expectReadable(page.locator(selector));
  await page.locator('#association-rows').getByRole('button', { name: 'Remover', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expectReadable(page.locator('#confirm-text'));
  await expectReadable(page.getByRole('dialog').getByRole('button', { name: 'Excluir', exact: true }));
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  fs.mkdirSync('.entrega', { recursive: true });
  await page.screenshot({ path: '.entrega/alto-contraste-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('alto contraste funciona em tela móvel e com armazenamento indisponível', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Armazenamento bloqueado'); };
    Storage.prototype.setItem = () => { throw new Error('Armazenamento bloqueado'); };
  });
  await page.goto('/');
  const toggle = page.locator('#contrast-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expectReadable(toggle);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#product-name')).toBeVisible();
  fs.mkdirSync('.entrega', { recursive: true });
  await page.screenshot({ path: '.entrega/alto-contraste-mobile.png', fullPage: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});
