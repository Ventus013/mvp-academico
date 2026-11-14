const { test, expect } = require('@playwright/test');

for (const kind of ['product', 'process']) {
  const collection = kind === 'product' ? 'products' : 'processes';
  const codeField = kind === 'product' ? 'sku' : 'code';
  const duplicateMessage = kind === 'product'
    ? 'Já existe um produto com este SKU'
    : 'Já existe um processo com este código';

  async function openForm(page) {
    await page.goto('/');
    await expect(page.locator('#product-count')).not.toHaveText('—');
    await page.locator(`.nav-button[data-view="${collection}"]`).click();
    return page.locator(`#${kind}-form`);
  }

  test(`${kind}: entradas inválidas indicam o campo e impedem envio à API`, async ({ page }) => {
    const form = await openForm(page);
    const writes = [];
    page.on('request', request => {
      if (request.method() === 'POST' && request.url().endsWith(`/api/${collection}`)) writes.push(request);
    });
    const cases = [
      { field: codeField, value: '', message: 'é obrigatório' },
      { field: codeField, value: '   ', message: 'é obrigatório' },
      { field: codeField, value: 'INVÁLIDO!', message: 'apenas letras, números' },
      { field: codeField, value: 'A'.repeat(41), message: 'até 40 caracteres' },
      { field: 'name', value: '', message: 'além de espaços' },
      { field: 'name', value: '   ', message: 'além de espaços' },
      { field: 'name', value: 'N'.repeat(121), message: 'no máximo 120' },
    ];
    if (kind === 'product') cases.push({ field: 'description', value: 'D'.repeat(1001), message: 'no máximo 1000' });
    for (const scenario of cases) {
      await form.locator(`[name="${codeField}"]`).fill('VALID-CODE');
      await form.locator('[name="name"]').fill('Nome válido');
      const field = form.locator(`[name="${scenario.field}"]`);
      // Assignment also exercises lengths beyond the HTML maxlength restriction.
      await field.evaluate((node, value) => {
        node.value = value;
        node.dispatchEvent(new Event('input', { bubbles: true }));
      }, scenario.value);
      await form.locator('[type="submit"]').click();
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      await expect(field).toBeFocused();
      await expect(page.locator(`#${kind}-${scenario.field}-error`)).toContainText(scenario.message);
      await expect(page.locator('#notice')).toHaveAttribute('role', 'alert');
      await expect(field).toHaveValue(scenario.value);
      await field.fill('Corrigido');
      await expect(field).toHaveAttribute('aria-invalid', 'false');
      await expect(page.locator(`#${kind}-${scenario.field}-error`)).toBeHidden();
    }
    expect(writes).toHaveLength(0);
  });

  test(`${kind}: normaliza espaços e código e aceita os limites válidos`, async ({ page, request }) => {
    const form = await openForm(page);
    const code = `${kind}-`.padEnd(40, 'a');
    const name = 'N'.repeat(120);
    await form.locator(`[name="${codeField}"]`).fill(code);
    await form.locator('[name="name"]').fill(name);
    if (kind === 'product') await form.locator('[name="description"]').fill('D'.repeat(1000));
    await form.locator('[type="submit"]').click();
    await expect(page.locator('#notice')).toHaveText('Cadastro criado.');
    const response = await request.get(`/api/${collection}`);
    const saved = (await response.json()).find(item => item[codeField] === code.toUpperCase());
    expect(saved.name).toBe(name);
    if (kind === 'product') expect(saved.description).toHaveLength(1000);
    const row = page.locator(`#${kind}-rows tr`).filter({ hasText: code.toUpperCase() });
    await row.getByRole('button', { name: 'Editar', exact: true }).click();
    await form.locator(`[name="${codeField}"]`).fill(`  ${kind}-trim  `);
    await form.locator('[name="name"]').fill('  Nome normalizado  ');
    if (kind === 'product') await form.locator('[name="description"]').fill('  Descrição normalizada  ');
    await form.locator('[type="submit"]').click();
    await expect(page.locator('#notice')).toHaveText('Cadastro atualizado.');
    const updated = await (await request.get(`/api/${collection}/${saved.id}`)).json();
    expect(updated[codeField]).toBe(`${kind}-trim`.toUpperCase());
    expect(updated.name).toBe('Nome normalizado');
    if (kind === 'product') expect(updated.description).toBe('Descrição normalizada');
  });

  test(`${kind}: duplicidade na criação e edição preserva dados e permite corrigir`, async ({ page, request }) => {
    const existing = await request.post(`/api/${collection}`, { data: { [codeField]: `${kind}-existing`, name: 'Existente' } });
    expect(existing.status()).toBe(201);
    const form = await openForm(page);
    const codeInput = form.locator(`[name="${codeField}"]`);
    await codeInput.fill(`  ${kind}-existing  `);
    await form.locator('[name="name"]').fill('Preservar nome');
    if (kind === 'product') await form.locator('[name="description"]').fill('Preservar descrição');
    for (const operation of ['create', 'edit']) {
      await form.locator('[type="submit"]').click();
      await expect(page.locator('#notice')).toContainText(duplicateMessage);
      await expect(codeInput).toHaveAttribute('aria-invalid', 'true');
      await expect(codeInput).toBeFocused();
      await expect(form.locator('[name="name"]')).toHaveValue('Preservar nome');
      if (kind === 'product') await expect(form.locator('[name="description"]')).toHaveValue('Preservar descrição');
      await codeInput.fill(`${kind}-${operation}-fixed`);
      await form.locator('[type="submit"]').click();
      await expect(page.locator('#notice')).toHaveText(operation === 'create' ? 'Cadastro criado.' : 'Cadastro atualizado.');
      await expect(page.locator(`#${kind}-${codeField}-error`)).toBeHidden();
      if (operation === 'create') {
        const row = page.locator(`#${kind}-rows tr`).filter({ hasText: `${kind}-create-fixed`.toUpperCase() });
        await row.getByRole('button', { name: 'Editar', exact: true }).click();
        await codeInput.fill(`${kind}-existing`);
      }
    }
    const items = await (await request.get(`/api/${collection}`)).json();
    expect(items.filter(item => item[codeField] === `${kind}-existing`.toUpperCase())).toHaveLength(1);
    expect(items.some(item => item[codeField] === `${kind}-edit-fixed`.toUpperCase())).toBe(true);
  });

  test(`${kind}: rejeição 400 da API mostra orientação em português e permite nova tentativa`, async ({ page }) => {
    const form = await openForm(page);
    await page.route(`**/api/${collection}`, route => route.fulfill({
      status: 400, contentType: 'application/json', body: JSON.stringify({ message: ['name must be a string'] }),
    }));
    await form.locator(`[name="${codeField}"]`).fill(`${kind}-retry`);
    await form.locator('[name="name"]').fill('Manter dados');
    await form.locator('[type="submit"]').click();
    await expect(page.locator('#notice')).toContainText('A API recusou os dados do cadastro. Confira');
    await expect(form.locator('[name="name"]')).toHaveValue('Manter dados');
    await page.unroute(`**/api/${collection}`);
    await form.locator('[type="submit"]').click();
    await expect(page.locator('#notice')).toHaveText('Cadastro criado.');
  });
}
