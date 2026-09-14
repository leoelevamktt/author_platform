(() => {
  'use strict';

  const STORAGE_KEY = 'author_platform_state_v7';
  const defaultState = {
    profile: {
      siteName: 'Casa Autoral',
      authorName: 'Nome do Autor',
      authorBio: 'Sou autor e compositor independente. Crio histórias sobre memória, encontros, escolhas e os pequenos acontecimentos que mudam o rumo de uma vida. Este espaço reúne tudo o que publico e componho.',
      instagram: '@casaautoral',
      youtube: 'Casa Autoral',
      spotify: 'Casa Autoral'
    },
    products: [
      { id: 'p1', title: 'Entre Linhas e Marés', type: 'livro', price: 24.90, label: 'EPUB + PDF', featured: true, description: 'Um romance curto sobre recomeços, cartas nunca enviadas e a cidade litorânea para onde um homem volta depois de muitos anos.' },
      { id: 'p2', title: 'Depois da Chuva', type: 'historia', price: 9.90, label: 'CONTO DIGITAL', featured: false, description: 'Uma história breve sobre dois desconhecidos, uma cafeteria quase vazia e uma conversa que muda o dia de ambos.' },
      { id: 'p3', title: 'Caderno de Madrugada', type: 'livro', price: 18.90, label: 'PDF', featured: false, description: 'Textos curtos, fragmentos e pequenas crônicas escritas entre silêncio, cidade e insônia.' },
      { id: 'p4', title: 'Horizonte de Vidro', type: 'musica', price: 6.90, label: 'FAIXA DIGITAL', featured: false, description: 'Composição instrumental contemplativa para piano, textura ambiente e pulso eletrônico discreto.' },
      { id: 'p5', title: 'Casa Vazia', type: 'musica', price: 6.90, label: 'FAIXA DIGITAL', featured: false, description: 'Canção minimalista sobre ausência, memória e as coisas que permanecem nos lugares.' },
      { id: 'p6', title: 'Pequenas Distâncias', type: 'historia', price: 12.90, label: 'NOVELA DIGITAL', featured: false, description: 'Três personagens, três cidades e os quilômetros invisíveis que existem entre querer ficar e precisar partir.' }
    ],
    tracks: [
      { id: 't1', title: 'Horizonte de Vidro', subtitle: 'Instrumental • 03:42', bpm: 72, productId: 'p4' },
      { id: 't2', title: 'Casa Vazia', subtitle: 'Canção • 04:08', bpm: 88, productId: 'p5' },
      { id: 't3', title: 'Depois do Último Trem', subtitle: 'Instrumental • 03:17', bpm: 64, productId: null }
    ],
    orders: [],
    messages: [],
    cart: []
  };

  const clone = (obj) => JSON.parse(JSON.stringify(obj));
  let state = loadState();
  let activeFilter = 'todos';
  let audioCtx = null;
  let activeOscillators = [];
  let playingTrack = null;
  let toastTimer = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
  const typeLabel = { livro: 'Livro digital', historia: 'História', musica: 'Música' };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved) return clone(defaultState);
      return {
        ...clone(defaultState),
        ...saved,
        profile: { ...defaultState.profile, ...(saved.profile || {}) },
        products: Array.isArray(saved.products) ? saved.products : clone(defaultState.products),
        tracks: Array.isArray(saved.tracks) ? saved.tracks : clone(defaultState.tracks),
        orders: Array.isArray(saved.orders) ? saved.orders : [],
        messages: Array.isArray(saved.messages) ? saved.messages : [],
        cart: Array.isArray(saved.cart) ? saved.cart : []
      };
    } catch {
      return clone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function toast(message) {
    const el = $('[data-toast]');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function renderAll() {
    renderProfile();
    renderProducts();
    renderTracks();
    renderCart();
    renderAdmin();
    $('[data-current-year]').textContent = new Date().getFullYear();
  }

  function renderProfile() {
    $$('[data-site-name]').forEach(el => el.textContent = state.profile.siteName);
    $$('[data-author-name]').forEach(el => el.textContent = state.profile.authorName);
    $('[data-author-bio]').textContent = state.profile.authorBio;

    const featured = state.products.find(p => p.featured) || state.products.find(p => p.type === 'livro') || state.products[0];
    if (featured) {
      $$('[data-featured-title]').forEach(el => el.textContent = featured.title);
      $('[data-featured-description]').textContent = featured.description;
      $('[data-featured-price]').textContent = money(featured.price);
      $('[data-buy-featured]').dataset.productId = featured.id;
    }

    const links = [
      ['Instagram', state.profile.instagram],
      ['YouTube', state.profile.youtube],
      ['Spotify', state.profile.spotify]
    ].filter(([, value]) => value && value.trim());
    $('[data-social-links]').innerHTML = links.map(([name, value]) => `<a href="#" data-local-social="${escapeHtml(name)}">${escapeHtml(name)} <span>↗</span><small>${escapeHtml(value)}</small></a>`).join('');
  }

  function renderProducts() {
    const list = activeFilter === 'todos' ? state.products : state.products.filter(p => p.type === activeFilter);
    const grid = $('[data-product-grid]');
    grid.innerHTML = list.map(product => `
      <article class="product-card reveal visible">
        <div class="product-art ${product.type}">
          <span class="product-label">${escapeHtml(product.label || typeLabel[product.type])}</span>
          <strong>${escapeHtml(product.title)}</strong>
          <span class="product-label">${escapeHtml(typeLabel[product.type] || product.type)}</span>
        </div>
        <div class="product-body">
          <h3>${escapeHtml(product.title)}</h3>
          <p>${escapeHtml(product.description)}</p>
          <div class="product-footer">
            <span class="product-price">${money(product.price)}</span>
            <button class="button button-primary" data-add-cart="${product.id}">Adicionar</button>
          </div>
        </div>
      </article>`).join('') || '<div class="empty-state">Nenhum produto nesta categoria.</div>';
  }

  function renderTracks() {
    const container = $('[data-track-list]');
    container.innerHTML = state.tracks.map((track, index) => {
      const product = state.products.find(p => p.id === track.productId);
      const bars = Array.from({ length: 24 }, () => '<i></i>').join('');
      return `<article class="track">
        <button class="play-button ${playingTrack === track.id ? 'playing' : ''}" data-play-track="${track.id}" aria-label="${playingTrack === track.id ? 'Parar' : 'Ouvir'} ${escapeHtml(track.title)}">${playingTrack === track.id ? '■' : '▶'}</button>
        <div class="track-title"><strong>${String(index + 1).padStart(2, '0')}. ${escapeHtml(track.title)}</strong><small>${escapeHtml(track.subtitle)}</small></div>
        <div class="track-wave" aria-hidden="true">${bars}</div>
        <span class="track-meta">${track.bpm} BPM</span>
        ${product ? `<button class="button button-ghost" data-add-cart="${product.id}">${money(product.price)}</button>` : '<span class="track-meta">preview</span>'}
      </article>`;
    }).join('');
  }

  function renderCart() {
    const validCart = state.cart.filter(id => state.products.some(p => p.id === id));
    if (validCart.length !== state.cart.length) {
      state.cart = validCart;
      saveState();
    }
    const products = state.cart.map(id => state.products.find(p => p.id === id)).filter(Boolean);
    const total = products.reduce((sum, p) => sum + Number(p.price), 0);
    $$('[data-cart-count]').forEach(el => el.textContent = products.length);
    $('[data-cart-total]').textContent = money(total);
    $('[data-cart-items]').innerHTML = products.map(product => `
      <div class="cart-item">
        <div class="cart-thumb ${product.type}">${escapeHtml(product.type)}</div>
        <div><strong>${escapeHtml(product.title)}</strong><small>${money(product.price)}</small></div>
        <button class="remove-item" data-remove-cart="${product.id}" aria-label="Remover ${escapeHtml(product.title)}">×</button>
      </div>`).join('');
    $('[data-cart-empty]').hidden = products.length > 0;
    $('[data-checkout]').disabled = products.length === 0;
    $('[data-checkout]').style.opacity = products.length ? '1' : '.45';
  }

  function addToCart(id) {
    if (!state.products.some(p => p.id === id)) return;
    if (state.cart.includes(id)) {
      toast('Este item já está no carrinho.');
      openCart();
      return;
    }
    state.cart.push(id);
    saveState();
    renderCart();
    toast('Item adicionado ao carrinho.');
  }

  function removeFromCart(id) {
    state.cart = state.cart.filter(item => item !== id);
    saveState();
    renderCart();
  }

  function openCart() {
    $('[data-cart-drawer]').classList.add('open');
    $('[data-cart-drawer]').setAttribute('aria-hidden', 'false');
    $('[data-scrim]').hidden = false;
    document.body.classList.add('locked');
  }

  function closeCart() {
    $('[data-cart-drawer]').classList.remove('open');
    $('[data-cart-drawer]').setAttribute('aria-hidden', 'true');
    $('[data-scrim]').hidden = true;
    document.body.classList.remove('locked');
  }

  function openCheckout() {
    if (!state.cart.length) return;
    closeCart();
    const products = state.cart.map(id => state.products.find(p => p.id === id)).filter(Boolean);
    $('[data-checkout-items]').innerHTML = products.map(p => `<div class="checkout-line"><span>${escapeHtml(p.title)}</span><strong>${money(p.price)}</strong></div>`).join('');
    $('[data-checkout-total]').textContent = money(products.reduce((s, p) => s + Number(p.price), 0));
    $('[data-checkout-modal]').showModal();
  }

  function completeCheckout(form) {
    const fd = new FormData(form);
    const products = state.cart.map(id => state.products.find(p => p.id === id)).filter(Boolean);
    const order = {
      id: `PED-${Date.now().toString().slice(-7)}`,
      createdAt: new Date().toISOString(),
      customer: { name: fd.get('name'), email: fd.get('email'), document: fd.get('document') },
      payment: fd.get('payment'),
      total: products.reduce((s, p) => s + Number(p.price), 0),
      items: products.map(p => ({ id: p.id, title: p.title, type: p.type, price: p.price }))
    };
    state.orders.unshift(order);
    state.cart = [];
    saveState();
    renderCart();
    renderAdmin();
    $('[data-checkout-modal]').close();
    showDownloads(order.items);
    form.reset();
  }

  function showDownloads(items) {
    const list = $('[data-download-list]');
    list.innerHTML = items.map(item => `<div class="download-item"><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(typeLabel[item.type] || item.type)}</small></div><button class="button button-primary" data-download-product="${item.id}">Baixar</button></div>`).join('');
    $('[data-success-modal]').showModal();
  }

  function downloadProduct(id) {
    const product = state.products.find(p => p.id === id);
    if (!product) return;
    const ext = product.type === 'musica' ? 'txt' : 'txt';
    const body = `${state.profile.siteName}\n${product.title}\n\n${product.description}\n\nProduto digital demonstrativo gerado localmente.\nAutor: ${state.profile.authorName}\nTipo: ${typeLabel[product.type]}\n`;
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(product.title)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Download iniciado.');
  }

  function playTrack(id) {
    if (playingTrack === id) {
      stopAudio();
      return;
    }
    stopAudio();
    const track = state.tracks.find(t => t.id === id);
    if (!track) return;
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const base = track.bpm < 70 ? 196 : track.bpm < 80 ? 220 : 246.94;
    [1, 1.5, 2].forEach((ratio, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.value = base * ratio;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(idx === 0 ? .045 : .018, now + .35);
      gain.gain.linearRampToValueAtTime(0, now + 6);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 6.1);
      activeOscillators.push(osc);
    });
    playingTrack = id;
    renderTracks();
    setTimeout(() => { if (playingTrack === id) stopAudio(); }, 6200);
  }

  function stopAudio() {
    activeOscillators.forEach(osc => { try { osc.stop(); } catch {} });
    activeOscillators = [];
    playingTrack = null;
    renderTracks();
  }

  function renderAdmin() {
    const list = $('[data-admin-product-list]');
    if (list) list.innerHTML = state.products.map(p => `<div class="admin-list-item"><div><h4>${escapeHtml(p.title)} ${p.featured ? '★' : ''}</h4><p>${escapeHtml(typeLabel[p.type] || p.type)} • ${money(p.price)} • ${escapeHtml(p.label || '')}</p></div><div class="admin-list-actions"><button class="mini-btn" data-edit-product="${p.id}">Editar</button><button class="mini-btn danger" data-delete-product="${p.id}">Excluir</button></div></div>`).join('');

    const ordersEl = $('[data-admin-orders]');
    if (ordersEl) ordersEl.innerHTML = state.orders.length ? `<table class="admin-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Pagamento</th><th>Total</th><th>Data</th></tr></thead><tbody>${state.orders.map(o => `<tr><td>${escapeHtml(o.id)}</td><td>${escapeHtml(o.customer?.name || '')}<br><small>${escapeHtml(o.customer?.email || '')}</small></td><td>${o.items.map(i => escapeHtml(i.title)).join('<br>')}</td><td>${escapeHtml(o.payment)}</td><td>${money(o.total)}</td><td>${formatDate(o.createdAt)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty-state">Nenhum pedido local ainda.</div>';

    const messagesEl = $('[data-admin-messages]');
    if (messagesEl) messagesEl.innerHTML = state.messages.length ? `<table class="admin-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Mensagem</th><th>Data</th></tr></thead><tbody>${state.messages.map(m => `<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.email)}</td><td>${escapeHtml(m.message)}</td><td>${formatDate(m.createdAt)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty-state">Nenhuma mensagem local ainda.</div>';
  }

  function fillProfileForm() {
    const form = $('[data-profile-form]');
    Object.entries(state.profile).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value || ''; });
  }

  function openAdmin() {
    $('[data-admin-modal]').showModal();
    $('[data-admin-login]').hidden = false;
    $('[data-admin-panel]').hidden = true;
  }

  function enterAdmin() {
    $('[data-admin-login]').hidden = true;
    $('[data-admin-panel]').hidden = false;
    fillProfileForm();
    renderAdmin();
  }

  function switchAdminTab(tab) {
    $$('[data-admin-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.adminTab === tab));
    $$('[data-admin-view]').forEach(view => view.hidden = view.dataset.adminView !== tab);
  }

  function saveProduct(form) {
    const fd = new FormData(form);
    const id = String(fd.get('id') || '');
    const product = {
      id: id || `p${Date.now()}`,
      title: String(fd.get('title')).trim(),
      type: String(fd.get('type')),
      price: Number(fd.get('price')),
      description: String(fd.get('description')).trim(),
      label: String(fd.get('label')).trim(),
      featured: fd.get('featured') === 'on'
    };
    if (product.featured) state.products.forEach(p => p.featured = false);
    const index = state.products.findIndex(p => p.id === id);
    if (index >= 0) state.products[index] = product; else state.products.unshift(product);
    saveState();
    form.reset();
    form.elements.id.value = '';
    $('[data-product-form-title]').textContent = 'Novo produto';
    renderAll();
    toast('Produto salvo.');
  }

  function editProduct(id) {
    const p = state.products.find(item => item.id === id);
    if (!p) return;
    const form = $('[data-product-form]');
    Object.entries(p).forEach(([key, value]) => {
      if (!form.elements[key]) return;
      if (form.elements[key].type === 'checkbox') form.elements[key].checked = Boolean(value);
      else form.elements[key].value = value;
    });
    $('[data-product-form-title]').textContent = 'Editar produto';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetProductForm() {
    const form = $('[data-product-form]');
    form.reset();
    form.elements.id.value = '';
    $('[data-product-form-title]').textContent = 'Novo produto';
  }

  function deleteProduct(id) {
    const p = state.products.find(item => item.id === id);
    if (!p || !confirm(`Excluir “${p.title}”?`)) return;
    state.products = state.products.filter(item => item.id !== id);
    state.cart = state.cart.filter(item => item !== id);
    state.tracks = state.tracks.map(t => t.productId === id ? { ...t, productId: null } : t);
    saveState();
    renderAll();
    toast('Produto excluído.');
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `author-platform-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.products) || !parsed.profile) throw new Error('Formato inválido');
        state = { ...clone(defaultState), ...parsed, profile: { ...defaultState.profile, ...parsed.profile } };
        saveState();
        renderAll();
        fillProfileForm();
        toast('Dados importados.');
      } catch {
        toast('Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
  }

  function resetExample() {
    if (!confirm('Restaurar todos os dados de exemplo? Pedidos e mensagens locais serão apagados.')) return;
    state = clone(defaultState);
    saveState();
    renderAll();
    fillProfileForm();
    toast('Exemplo restaurado.');
  }

  function saveProfile(form) {
    const fd = new FormData(form);
    state.profile = {
      siteName: String(fd.get('siteName')).trim(),
      authorName: String(fd.get('authorName')).trim(),
      authorBio: String(fd.get('authorBio')).trim(),
      instagram: String(fd.get('instagram')).trim(),
      youtube: String(fd.get('youtube')).trim(),
      spotify: String(fd.get('spotify')).trim()
    };
    saveState();
    renderProfile();
    toast('Perfil atualizado.');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }
  function slugify(value) { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function formatDate(value) { try { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); } catch { return value; } }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('button, a');
    if (!target) return;

    if (target.matches('[data-open-cart]')) openCart();
    if (target.matches('[data-close-cart], [data-scrim]')) closeCart();
    if (target.matches('[data-add-cart]')) addToCart(target.dataset.addCart);
    if (target.matches('[data-buy-featured]')) { addToCart(target.dataset.productId); openCart(); }
    if (target.matches('[data-remove-cart]')) removeFromCart(target.dataset.removeCart);
    if (target.matches('[data-checkout]')) openCheckout();
    if (target.matches('[data-close-checkout]')) $('[data-checkout-modal]').close();
    if (target.matches('[data-close-success]')) $('[data-success-modal]').close();
    if (target.matches('[data-download-product]')) downloadProduct(target.dataset.downloadProduct);
    if (target.matches('[data-play-track]')) playTrack(target.dataset.playTrack);
    if (target.matches('[data-open-admin]')) openAdmin();
    if (target.matches('[data-close-admin]')) $('[data-admin-modal]').close();
    if (target.matches('[data-admin-tab]')) switchAdminTab(target.dataset.adminTab);
    if (target.matches('[data-edit-product]')) editProduct(target.dataset.editProduct);
    if (target.matches('[data-delete-product]')) deleteProduct(target.dataset.deleteProduct);
    if (target.matches('[data-cancel-edit]')) resetProductForm();
    if (target.matches('[data-export]')) exportData();
    if (target.matches('[data-reset]')) resetExample();
    if (target.matches('[data-local-social]')) { event.preventDefault(); toast(`${target.dataset.localSocial}: configure o link real no painel.`); }
    if (target.matches('.filter')) {
      activeFilter = target.dataset.filter;
      $$('.filter').forEach(btn => btn.classList.toggle('active', btn === target));
      renderProducts();
    }
    if (target.matches('.menu-toggle')) {
      const nav = $('#main-nav');
      nav.classList.toggle('open');
      target.setAttribute('aria-expanded', String(nav.classList.contains('open')));
    }
    if (target.matches('.main-nav a')) {
      $('#main-nav').classList.remove('open');
      $('.menu-toggle').setAttribute('aria-expanded', 'false');
    }
  });

  $('[data-scrim]').addEventListener('click', closeCart);
  $('[data-checkout-form]').addEventListener('submit', (e) => { e.preventDefault(); completeCheckout(e.currentTarget); });
  $('[data-contact-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    state.messages.unshift({ name: fd.get('name'), email: fd.get('email'), message: fd.get('message'), createdAt: new Date().toISOString() });
    saveState();
    renderAdmin();
    e.currentTarget.reset();
    $('[data-contact-status]').textContent = 'Mensagem salva localmente com sucesso.';
    toast('Mensagem salva no navegador.');
  });
  $('[data-admin-login-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.currentTarget.elements.password.value === '2026') { e.currentTarget.reset(); $('[data-admin-login-status]').textContent = ''; enterAdmin(); }
    else $('[data-admin-login-status]').textContent = 'Senha incorreta.';
  });
  $('[data-product-form]').addEventListener('submit', (e) => { e.preventDefault(); saveProduct(e.currentTarget); });
  $('[data-profile-form]').addEventListener('submit', (e) => { e.preventDefault(); saveProfile(e.currentTarget); });
  $('[data-import]').addEventListener('change', (e) => { importData(e.target.files[0]); e.target.value = ''; });

  [ $('[data-checkout-modal]'), $('[data-success-modal]'), $('[data-admin-modal]') ].forEach(dialog => {
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const outside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
      if (outside) dialog.close();
    });
  });

  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .12 });
  $$('.reveal').forEach(el => observer.observe(el));

  renderAll();
})();
