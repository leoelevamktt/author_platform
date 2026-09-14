(() => {
  'use strict';
  if (typeof state === 'undefined' || typeof save !== 'function' || typeof render !== 'function') return;

  state.orders = Array.isArray(state.orders) ? state.orders : [];
  state.messages = Array.isArray(state.messages) ? state.messages : [];
  state.media = Array.isArray(state.media) ? state.media : [];
  save();

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate = (v) => { try { return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)); } catch { return '—'; } };

  const style = document.createElement('style');
  style.textContent = `
    .admin-plus-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.admin-plus-actions input[type=file]{display:none}
    .admin-upload{border:1px dashed rgba(24,22,17,.22);border-radius:14px;padding:12px;background:rgba(255,255,255,.42);display:grid;gap:10px}
    .admin-upload-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.admin-upload-preview{display:flex;gap:12px;align-items:center;min-height:72px}
    .admin-upload-preview img{width:62px;height:74px;object-fit:cover;border-radius:10px;border:1px solid var(--line);background:#eee}.admin-upload-preview span{color:var(--muted);font-size:11px;line-height:1.5}
    .admin-upload label,.media-upload-btn{display:inline-flex;align-items:center;justify-content:center;width:max-content;border:1px solid var(--line);border-radius:999px;padding:8px 11px;background:white;cursor:pointer;font-size:11px}.admin-upload input[type=file],.media-upload-btn input{display:none}
    .admin-row-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.mini.danger{color:#8b3128}.mini.danger:hover{background:#8b3128;color:#fff}
    .admin-dashboard-extra{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}.admin-card{border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.52);padding:15px}.admin-card h3{font:500 22px var(--serif);margin:0 0 10px}.admin-feed{display:grid;gap:8px}.admin-feed-item{padding:9px 0;border-bottom:1px solid var(--line)}.admin-feed-item:last-child{border:0}.admin-feed-item strong{display:block;font:500 15px var(--serif)}.admin-feed-item small{color:var(--muted);line-height:1.5}
    .media-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}.media-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.media-card{border:1px solid var(--line);border-radius:15px;padding:9px;background:rgba(255,255,255,.56)}.media-card img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:10px;background:#eee}.media-card strong{display:block;font-size:11px;margin:8px 0 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.media-card small{color:var(--muted);font-size:10px}.media-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}
    .admin-table-actions{display:flex;justify-content:flex-end;margin-bottom:10px}.admin-empty{padding:25px;text-align:center;border:1px dashed var(--line);border-radius:14px;color:var(--muted);font-size:12px}
    .admin-toast{position:fixed;bottom:22px;left:50%;transform:translate(-50%,25px);background:var(--ink);color:var(--paper);padding:10px 15px;border-radius:999px;z-index:120;opacity:0;transition:.2s;font-size:11px;pointer-events:none}.admin-toast.show{opacity:1;transform:translate(-50%,0)}
    @media(max-width:900px){.media-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-dashboard-extra{grid-template-columns:1fr}}
    @media(max-width:520px){.media-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const toastEl = document.createElement('div');
  toastEl.className = 'admin-toast';
  document.body.appendChild(toastEl);
  let toastTimer;
  function toast(msg){ toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastEl.classList.remove('show'),1800); }

  async function compressImage(file, maxSide = 1100, quality = .82){
    if (!file || !file.type.startsWith('image/')) throw new Error('Arquivo inválido');
    if (file.size > 12 * 1024 * 1024) throw new Error('Imagem muito grande. Use até 12 MB.');
    const data = await new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); });
    const img = await new Promise((resolve,reject)=>{ const i=new Image(); i.onload=()=>resolve(i); i.onerror=reject; i.src=data; });
    let w=img.naturalWidth, h=img.naturalHeight;
    const scale=Math.min(1,maxSide/Math.max(w,h)); w=Math.max(1,Math.round(w*scale)); h=Math.max(1,Math.round(h*scale));
    const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0,w,h);
    return canvas.toDataURL('image/webp',quality);
  }

  function ensureTabs(){
    const tabs=document.querySelector('.tabs');
    if(!tabs) return;
    const addTab=(name,label)=>{
      if(tabs.querySelector(`[data-tab="${name}"]`)) return;
      const b=document.createElement('button'); b.type='button'; b.dataset.tab=name; b.textContent=label; tabs.appendChild(b);
      const section=document.createElement('section'); section.className='view'; section.dataset.view=name; section.id=`admin-${name}`; tabs.parentElement.appendChild(section);
    };
    addTab('orders','Pedidos');
    addTab('media','Mídia');
  }

  function ensureTopActions(){
    const top=document.querySelector('.admin-top'); if(!top || top.querySelector('.admin-plus-actions')) return;
    const box=document.createElement('div'); box.className='admin-plus-actions';
    box.innerHTML=`<label class="btn">Importar JSON<input id="adminImportJson" type="file" accept="application/json"></label><button class="btn" type="button" id="adminResetData">Restaurar exemplo</button>`;
    top.appendChild(box);
    box.querySelector('#adminImportJson').addEventListener('change', async e=>{
      const file=e.target.files[0]; if(!file) return;
      try{
        const parsed=JSON.parse(await file.text());
        if(!parsed || !Array.isArray(parsed.products) || !parsed.profile) throw new Error();
        Object.keys(state).forEach(k=>delete state[k]); Object.assign(state,parsed);
        state.orders=Array.isArray(state.orders)?state.orders:[]; state.messages=Array.isArray(state.messages)?state.messages:[]; state.media=Array.isArray(state.media)?state.media:[];
        save(); render(); toast('Backup importado.');
      }catch{ alert('Arquivo JSON inválido.'); }
      e.target.value='';
    });
    box.querySelector('#adminResetData').addEventListener('click',()=>{
      if(!confirm('Restaurar os dados originais? Produtos, pedidos, mensagens e imagens locais serão substituídos.')) return;
      const fresh=structuredClone(DEFAULT); fresh.orders=[]; fresh.messages=[]; fresh.media=[];
      Object.keys(state).forEach(k=>delete state[k]); Object.assign(state,fresh); save(); render(); toast('Dados restaurados.');
    });
  }

  function createUploader(form, type){
    if(!form || form.querySelector(`[data-uploader="${type}"]`)) return;
    const imageInput=form.elements.image || form.elements.authorImage; if(!imageInput) return;
    const wrap=document.createElement('div'); wrap.className='admin-upload'; wrap.dataset.uploader=type;
    wrap.innerHTML=`<div class="admin-upload-head"><strong>${type==='product'?'Imagem do produto':'Foto do autor'}</strong><label>Importar do PC<input type="file" accept="image/*"></label></div><div class="admin-upload-preview"><img alt="Prévia"><span>Escolha JPG, PNG ou WebP. A imagem será otimizada e salva somente neste navegador.</span></div>`;
    const label=imageInput.closest('label'); (label||imageInput).insertAdjacentElement('afterend',wrap);
    const preview=wrap.querySelector('img');
    const sync=()=>{ const v=imageInput.value; preview.src=v || ''; preview.style.visibility=v?'visible':'hidden'; };
    sync(); imageInput.addEventListener('input',sync); imageInput.addEventListener('change',sync);
    wrap.querySelector('input[type=file]').addEventListener('change',async e=>{
      const file=e.target.files[0]; if(!file) return;
      try{ const data=await compressImage(file,type==='product'?1200:1000,.80); imageInput.value=data; imageInput.dispatchEvent(new Event('input',{bubbles:true})); toast('Imagem carregada do computador.'); }
      catch(err){ alert(err.message||'Não foi possível carregar a imagem.'); }
      e.target.value='';
    });
    wrap._syncPreview=sync;
  }

  function renderDashboardExtra(){
    const view=document.querySelector('[data-view="dashboard"]'); if(!view) return;
    let extra=view.querySelector('.admin-dashboard-extra'); if(!extra){ extra=document.createElement('div'); extra.className='admin-dashboard-extra'; view.appendChild(extra); }
    const orders=(state.orders||[]).slice(0,4), msgs=(state.messages||[]).slice(0,4);
    extra.innerHTML=`<div class="admin-card"><h3>Pedidos recentes</h3><div class="admin-feed">${orders.length?orders.map(o=>`<div class="admin-feed-item"><strong>${esc(o.id||'Pedido')}</strong><small>${esc(o.customer?.name||'Cliente')} · ${money(o.total||0)} · ${esc(o.payment||'')}</small></div>`).join(''):'<div class="admin-empty">Nenhum pedido ainda.</div>'}</div></div><div class="admin-card"><h3>Mensagens recentes</h3><div class="admin-feed">${msgs.length?msgs.map(m=>`<div class="admin-feed-item"><strong>${esc(m.name||'Contato')}</strong><small>${esc(String(m.message||'').slice(0,95))}</small></div>`).join(''):'<div class="admin-empty">Nenhuma mensagem ainda.</div>'}</div></div>`;
  }

  function renderOrders(){
    const view=document.querySelector('[data-view="orders"]'); if(!view) return;
    const orders=state.orders||[];
    view.innerHTML=`<div class="admin-table-actions"><button class="mini danger" type="button" data-clear-orders>Limpar pedidos</button></div>${orders.length?`<div style="overflow:auto"><table class="table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Pagamento</th><th>Total</th><th>Data</th><th></th></tr></thead><tbody>${orders.map(o=>`<tr><td>${esc(o.id)}</td><td>${esc(o.customer?.name||'')}<br><small>${esc(o.customer?.email||'')}</small></td><td>${(o.items||[]).map(i=>esc(i.title)).join('<br>')}</td><td>${esc(o.payment||'')}</td><td>${money(o.total||0)}</td><td>${fmtDate(o.createdAt)}</td><td><button class="mini danger" data-delete-order="${esc(o.id)}">Excluir</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="admin-empty">Nenhum pedido simulado registrado.</div>'}`;
  }

  function renderMessagesPlus(){
    const el=document.getElementById('messages'); if(!el) return;
    const msgs=state.messages||[];
    el.innerHTML=`<div class="admin-table-actions"><button class="mini danger" type="button" data-clear-messages>Limpar mensagens</button></div>${msgs.length?`<div style="overflow:auto"><table class="table"><thead><tr><th>Nome</th><th>E-mail</th><th>Mensagem</th><th></th></tr></thead><tbody>${msgs.map((m,i)=>`<tr><td>${esc(m.name)}</td><td>${esc(m.email)}</td><td>${esc(m.message)}</td><td><button class="mini danger" data-delete-message="${i}">Excluir</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="admin-empty">Nenhuma mensagem ainda.</div>'}`;
  }

  function enhanceProductRows(){
    document.querySelectorAll('#adminProducts .admin-row').forEach(row=>{
      const edit=row.querySelector('[data-edit]'); if(!edit || row.querySelector('.admin-row-actions')) return;
      const id=edit.dataset.edit; const actions=document.createElement('div'); actions.className='admin-row-actions';
      edit.replaceWith(actions); actions.appendChild(edit);
      actions.insertAdjacentHTML('beforeend',`<button class="mini" type="button" data-duplicate-product="${esc(id)}">Duplicar</button><button class="mini danger" type="button" data-delete-product-plus="${esc(id)}">Excluir</button>`);
    });
  }

  function renderMedia(){
    const view=document.querySelector('[data-view="media"]'); if(!view) return;
    const media=state.media||[];
    view.innerHTML=`<div class="media-toolbar"><div><p class="eyebrow">Biblioteca local</p><strong>Imagens importadas do computador</strong><p class="note">As imagens ficam apenas neste navegador e entram no backup JSON.</p></div><label class="media-upload-btn">Adicionar imagens<input id="mediaFiles" type="file" accept="image/*" multiple></label></div><div class="media-grid">${media.length?media.map(m=>`<article class="media-card"><img src="${m.data}" alt="${esc(m.name)}"><strong>${esc(m.name)}</strong><small>${fmtDate(m.createdAt)}</small><div class="media-actions"><button class="mini" data-use-media-product="${m.id}">Usar em produto</button><button class="mini" data-use-media-author="${m.id}">Usar no autor</button><button class="mini danger" data-delete-media="${m.id}">Excluir</button></div></article>`).join(''):'<div class="admin-empty" style="grid-column:1/-1">Nenhuma imagem importada ainda.</div>'}</div>`;
    const input=view.querySelector('#mediaFiles');
    input?.addEventListener('change', async e=>{
      for(const file of [...e.target.files]){
        try{ const data=await compressImage(file,1100,.78); state.media.unshift({id:'m'+Date.now()+Math.random().toString(16).slice(2),name:file.name,data,createdAt:new Date().toISOString()}); }
        catch(err){ console.warn(err); }
      }
      save(); renderAdmin(); toast('Biblioteca atualizada.');
    });
  }

  const originalRenderAdmin = renderAdmin;
  renderAdmin = function(){
    originalRenderAdmin();
    if(!document.getElementById('adminPanel') || document.getElementById('adminPanel').hidden) return;
    ensureTabs(); ensureTopActions(); createUploader(document.getElementById('productForm'),'product'); createUploader(document.getElementById('profileForm'),'author');
    const revenue=(state.orders||[]).reduce((a,o)=>a+(Number(o.total)||0),0);
    const stats=document.getElementById('stats'); if(stats) stats.innerHTML=[['Produtos',state.products.length],['Pedidos',(state.orders||[]).length],['Receita simulada',money(revenue)],['Mensagens',(state.messages||[]).length],['Mídias locais',(state.media||[]).length],['Destaque',featured().title]].map(x=>`<div class="stat"><small>${esc(x[0])}</small><strong>${esc(x[1])}</strong></div>`).join('');
    renderDashboardExtra(); renderOrders(); renderMessagesPlus(); enhanceProductRows(); renderMedia();
    document.querySelectorAll('[data-uploader]').forEach(w=>w._syncPreview?.());
  };

  document.addEventListener('click', e=>{
    const t=e.target.closest('button'); if(!t) return;
    if(t.dataset.duplicateProduct){
      const p=state.products.find(x=>x.id===t.dataset.duplicateProduct); if(!p) return;
      state.products.unshift({...p,id:'p'+Date.now(),title:p.title+' (cópia)',featured:false}); save(); render(); toast('Produto duplicado.');
    }
    if(t.dataset.deleteProductPlus){
      const p=state.products.find(x=>x.id===t.dataset.deleteProductPlus); if(!p||!confirm(`Excluir “${p.title}”?`)) return;
      state.products=state.products.filter(x=>x.id!==p.id); state.cart=state.cart.filter(x=>x!==p.id); save(); render(); toast('Produto excluído.');
    }
    if(t.dataset.deleteOrder){ state.orders=state.orders.filter(o=>o.id!==t.dataset.deleteOrder); save(); renderAdmin(); toast('Pedido excluído.'); }
    if(t.hasAttribute('data-clear-orders') && confirm('Limpar todos os pedidos?')){ state.orders=[]; save(); renderAdmin(); }
    if(t.dataset.deleteMessage!==undefined){ state.messages.splice(Number(t.dataset.deleteMessage),1); save(); renderAdmin(); toast('Mensagem excluída.'); }
    if(t.hasAttribute('data-clear-messages') && confirm('Limpar todas as mensagens?')){ state.messages=[]; save(); renderAdmin(); }
    if(t.dataset.deleteMedia){ state.media=state.media.filter(m=>m.id!==t.dataset.deleteMedia); save(); renderAdmin(); toast('Imagem removida da biblioteca.'); }
    if(t.dataset.useMediaProduct){
      const m=state.media.find(x=>x.id===t.dataset.useMediaProduct), f=document.getElementById('productForm'); if(!m||!f) return;
      f.elements.image.value=m.data; f.elements.image.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('[data-tab="products"]')?.click(); toast('Imagem aplicada ao formulário de produto.');
    }
    if(t.dataset.useMediaAuthor){
      const m=state.media.find(x=>x.id===t.dataset.useMediaAuthor), f=document.getElementById('profileForm'); if(!m||!f) return;
      f.elements.authorImage.value=m.data; f.elements.authorImage.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('[data-tab="profile"]')?.click(); toast('Imagem aplicada ao perfil do autor.');
    }
    if(t.dataset.edit){ setTimeout(()=>document.querySelectorAll('[data-uploader]').forEach(w=>w._syncPreview?.()),0); }
  });

  const oldExport=document.getElementById('exportBtn');
  if(oldExport) oldExport.textContent='Exportar backup';
  ensureTabs(); ensureTopActions();
})();