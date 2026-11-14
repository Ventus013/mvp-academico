'use strict';
const $ = id => document.getElementById(id);
const state = { products: [], processes: [], links: [], selection: '', busy: false, request: 0 };
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function notice(message, error = false) {
  $('notice').textContent = message;
  $('notice').className = error ? 'notice error' : 'notice';
  $('notice').hidden = false;
  $('notice').setAttribute('role', error ? 'alert' : 'status');
}
async function api(path, method = 'GET', data) {
  let response;
  try {
    response = await fetch('/api' + path, {
      method, headers: { 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(10000),
    });
  } catch { throw new Error('Não foi possível conectar à API. Confira se a aplicação e o banco estão disponíveis.'); }
  if (response.status === 204) return null;
  let value;
  try { value = await response.json(); } catch { throw new Error('A API retornou uma resposta inesperada.'); }
  if (!response.ok) {
    if (response.status >= 500) throw new Error('O serviço não conseguiu concluir a operação. Confira a conexão com o banco e tente novamente.');
    const error = new Error(Array.isArray(value.message) ? value.message.join(' · ') : value.message || 'Não foi possível concluir a operação.');
    error.status = response.status;
    throw error;
  }
  return value;
}
async function all(path) {
  const items = [];
  for (let offset = 0; ; offset += 100) {
    const page = await api(`${path}?limit=100&offset=${offset}`);
    items.push(...page);
    if (page.length < 100) return items;
  }
}
async function action(task) {
  if (state.busy) return;
  state.busy = true;
  document.querySelectorAll('button:not(.nav-button), select').forEach(node => { node.disabled = true; });
  try { await task(); }
  catch (error) { notice(error.message || 'Ocorreu um erro inesperado.', true); }
  finally {
    state.busy = false;
    document.querySelectorAll('button, select').forEach(node => { node.disabled = false; });
  }
}
function show(view) {
  const descriptions = {
    products: ['Seu catálogo, em ordem.', 'Cadastre produtos e conecte as etapas que dão forma a cada um.'],
    processes: ['Cada etapa tem seu lugar.', 'Organize uma biblioteca de processos simples e reutilizáveis.'],
    associations: ['Conecte. Organize. Avance.', 'Escolha um produto e construa sua sequência de processos.'],
  };
  document.querySelectorAll('.view').forEach(node => { node.hidden = node.id !== view + '-view'; });
  document.querySelectorAll('.nav-button').forEach(node => {
    node.classList.toggle('active', node.dataset.view === view);
    if (node.dataset.view === view) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current');
  });
  $('page-title').textContent = descriptions[view][0];
  $('page-description').textContent = descriptions[view][1];
}
function button(label, task, remove = false) {
  const node = element('button', label, 'text-button' + (remove ? ' remove' : ''));
  node.type = 'button'; node.addEventListener('click', task);
  return node;
}
function resetForm(kind) {
  const form = $(kind + '-form'); form.reset(); form.elements.namedItem('id').value = '';
  clearErrors(form);
  $(kind + '-form-title').textContent = kind === 'product' ? 'Novo produto' : 'Novo processo';
  $(kind + '-cancel').hidden = true;
}
function edit(kind, item) {
  const form = $(kind + '-form');
  clearErrors(form);
  for (const field of ['id', 'name', kind === 'product' ? 'sku' : 'code']) form.elements.namedItem(field).value = item[field];
  if (kind === 'product') form.elements.namedItem('description').value = item.description;
  $(kind + '-form-title').textContent = kind === 'product' ? 'Editar produto' : 'Editar processo';
  $(kind + '-cancel').hidden = false;
  form.elements.namedItem('name').focus();
}
async function confirmDelete(message) {
  const dialog = $('confirm-dialog'); $('confirm-text').textContent = message;
  dialog.returnValue = 'cancel'; dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
}
function renderCatalog(kind) {
  const products = kind === 'product';
  const query = $(kind + '-search').value.trim().toLocaleLowerCase('pt-BR');
  const items = state[products ? 'products' : 'processes'].filter(item => `${item.name} ${products ? item.sku : item.code}`.toLocaleLowerCase('pt-BR').includes(query));
  const rows = $(kind + '-rows'); rows.replaceChildren();
  $(kind + '-empty').hidden = items.length > 0;
  $(kind + '-empty').textContent = query ? 'Nenhum resultado para essa busca.' : products ? 'Nenhum produto por aqui. Comece pelo formulário ao lado.' : 'Nenhum processo cadastrado. Crie a primeira etapa.';
  for (const item of items) {
    const row = element('tr'); const name = element('td');
    name.append(element('strong', item.name));
    if (products && item.description) name.append(element('small', item.description));
    const code = element('td'); code.append(element('code', products ? item.sku : item.code));
    const actions = element('div', undefined, 'actions');
    actions.append(button('Editar', () => edit(kind, item)));
    if (products) actions.append(button('Etapas', () => action(async () => {
      state.selection = item.id; $('association-product').value = item.id; show('associations'); await loadLinks();
    })));
    actions.append(button('Excluir', async () => {
      const message = products ? `Excluir “${item.name}”? As associações deste produto também serão removidas. Os processos serão preservados.` : `Excluir “${item.name}”? Processos associados a produtos precisam ser desvinculados primeiro.`;
      if (!await confirmDelete(message)) return;
      await action(async () => {
        await api(`/${products ? 'products' : 'processes'}/${item.id}`, 'DELETE');
        if ($(kind + '-form').elements.namedItem('id').value === item.id) resetForm(kind);
        notice('Cadastro excluído.'); await refreshAfterSave();
      });
    }, true));
    const cell = element('td'); cell.append(actions); row.append(name, code, cell); rows.append(row);
  }
}
function options(select, items, key, placeholder, selected = '') {
  select.replaceChildren(new Option(placeholder, ''));
  items.forEach(item => select.add(new Option(`${item[key]} · ${item.name}`, item.id)));
  select.value = selected;
}
function renderLinks() {
  $('association-rows').replaceChildren();
  $('association-total').textContent = `${state.links.length} ${state.links.length === 1 ? 'etapa' : 'etapas'}`;
  $('association-empty').hidden = state.links.length > 0;
  $('association-empty').textContent = state.selection ? 'Este produto ainda não tem etapas. Adicione um processo à sequência.' : 'Selecione um produto para ver sua sequência.';
  const used = new Set(state.links.map(item => item.id));
  options($('association-process'), state.processes.filter(item => !used.has(item.id)), 'code', 'Selecione um processo');
  const occupied = new Set(state.links.map(item => item.position));
  let next = 1; while (occupied.has(next) && next < 10000) next++;
  $('association-position').value = String(next);
  for (const item of state.links) {
    const row = element('li'); const info = element('div', undefined, 'step-info');
    info.append(element('strong', item.name), element('small', item.code));
    row.append(element('span', String(item.position).padStart(2, '0'), 'step-number'), info,
      button('Remover', async () => {
        if (!await confirmDelete(`Remover “${item.name}” da sequência? O cadastro do processo será preservado.`)) return;
        await action(async () => {
          await api(`/products/${state.selection}/processes/${item.id}`, 'DELETE');
          notice('Associação removida.'); await loadLinks();
        });
      }, true));
    $('association-rows').append(row);
  }
}
async function loadLinks() {
  const request = ++state.request;
  const selected = state.selection;
  state.links = []; renderLinks();
  if (!selected) return;
  $('association-empty').textContent = 'Carregando sequência…';
  try {
    const links = await api(`/products/${selected}/processes`);
    if (request !== state.request || selected !== state.selection) return;
    state.links = links; renderLinks();
  } catch (error) {
    if (request === state.request) $('association-empty').textContent = 'Não foi possível carregar a sequência. Tente atualizar.';
    throw error;
  }
}
async function refresh() {
  const [products, processes] = await Promise.all([all('/products'), all('/processes')]);
  state.products = products; state.processes = processes;
  if (!products.some(item => item.id === state.selection)) state.selection = '';
  $('product-count').textContent = String(products.length); $('process-count').textContent = String(processes.length);
  renderCatalog('product'); renderCatalog('process');
  options($('association-product'), products, 'sku', 'Selecione um produto', state.selection);
  await loadLinks();
}
async function refreshAfterSave() {
  try { await refresh(); }
  catch { notice('A alteração foi salva, mas a lista não pôde ser atualizada. Clique em Atualizar antes de repetir a operação.', true); }
}
function fieldError(field, message) {
  field.setAttribute('aria-invalid', String(Boolean(message)));
  const feedback = $(field.id + '-error');
  feedback.textContent = message;
  feedback.hidden = !message;
}
function clearErrors(form) {
  form.querySelectorAll('[aria-invalid]').forEach(field => fieldError(field, ''));
}
function validateCatalog(form, data, codeField) {
  clearErrors(form);
  const codeLabel = codeField === 'sku' ? 'O código SKU' : 'O código do processo';
  const errors = {};
  if (!data[codeField]) errors[codeField] = `${codeLabel} é obrigatório.`;
  else if (data[codeField].length > 40 || !/^[A-Z0-9_-]+$/.test(data[codeField])) {
    errors[codeField] = `${codeLabel} deve ter até 40 caracteres e usar apenas letras, números, hífen ou sublinhado.`;
  }
  if (!data.name) errors.name = 'Informe um nome com pelo menos um caractere além de espaços.';
  else if (data.name.length > 120) errors.name = 'O nome deve ter no máximo 120 caracteres.';
  if (data.description?.length > 1000) errors.description = 'A descrição deve ter no máximo 1000 caracteres.';
  for (const [name, message] of Object.entries(errors)) fieldError(form.elements.namedItem(name), message);
  const first = Object.keys(errors)[0];
  if (!first) return true;
  notice('Revise os campos indicados antes de salvar o cadastro.', true);
  form.elements.namedItem(first).focus();
  return false;
}
for (const kind of ['product', 'process']) {
  const form = $(kind + '-form');
  const codeField = kind === 'product' ? 'sku' : 'code';
  form.noValidate = true;
  for (const name of [codeField, 'name', ...(kind === 'product' ? ['description'] : [])]) {
    const field = form.elements.namedItem(name);
    const feedback = element('small', '', 'notice error');
    feedback.id = field.id + '-error'; feedback.hidden = true;
    field.setAttribute('aria-describedby', feedback.id);
    field.after(feedback);
    field.addEventListener('input', () => fieldError(field, ''));
  }
  $(kind + '-search').addEventListener('input', () => renderCatalog(kind));
  $(kind + '-cancel').addEventListener('click', () => resetForm(kind));
  $(kind + '-form').addEventListener('submit', event => {
    event.preventDefault();
    action(async () => {
      const form = event.currentTarget || $(kind + '-form');
      const data = Object.fromEntries(new FormData(form));
      const id = data.id; delete data.id;
      for (const key of Object.keys(data)) data[key] = data[key].trim();
      data[codeField] = data[codeField].toUpperCase();
      if (!validateCatalog(form, data, codeField)) return;
      try {
        await api(`/${kind === 'product' ? 'products' : 'processes'}${id ? '/' + id : ''}`, id ? 'PUT' : 'POST', data);
      } catch (error) {
        if (error.status === 409) {
          const field = form.elements.namedItem(codeField);
          error.message = `${kind === 'product' ? 'Já existe um produto com este SKU' : 'Já existe um processo com este código'}. Use outro código ou edite o cadastro existente.`;
          fieldError(field, error.message);
          field.focus();
        } else if (error.status === 400) {
          error.message = 'A API recusou os dados do cadastro. Confira o código, o nome (até 120 caracteres) e a descrição (até 1000 caracteres) antes de tentar novamente.';
        }
        throw error;
      }
      resetForm(kind); notice(id ? 'Cadastro atualizado.' : 'Cadastro criado.'); await refreshAfterSave();
    });
  });
}
$('association-product').addEventListener('change', () => action(async () => { state.selection = $('association-product').value; await loadLinks(); }));
$('association-form').addEventListener('submit', event => {
  event.preventDefault();
  action(async () => {
    if (!state.selection) throw new Error('Selecione um produto antes de associar um processo.');
    await api(`/products/${state.selection}/processes/${$('association-process').value}`, 'POST', { position: Number($('association-position').value) });
    notice('Processo associado ao produto.'); await loadLinks();
  });
});
document.querySelectorAll('.nav-button').forEach(node => node.addEventListener('click', () => show(node.dataset.view)));
$('refresh').addEventListener('click', () => action(async () => { await refresh(); notice('Catálogo atualizado.'); }));
action(refresh);
