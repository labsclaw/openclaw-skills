// snapshot.js — Snapshot atômico indexado com ESTADO EXPLÍCITO (ultra-browser-v2)
// Rodar via browser-harness: js(<este script>) — retorna JSON {url, title, elements, pageText}
//
// As 3 regras validadas na avaliação (phase3-free-models.md):
// 1. Estado explícito por elemento (inputs: value=..., selects: current=..., checkboxes: checked=...)
// 2. Índices estáveis [1..N] por ciclo (DOM order, shadow DOM incluído)
// 3. pageText junto (modelos respondem leitura sem cliques extras)

(() => {
  const els = [];
  let i = 0;

  const describe = (n, tag) => {
    const r = n.getBoundingClientRect();
    let text = '';
    if (tag === 'select') {
      text = 'current=' + (n.selectedOptions && n.selectedOptions[0] ? n.selectedOptions[0].text : '(none)');
    } else if (tag === 'input' && n.type === 'checkbox') {
      text = 'checked=' + n.checked;
    } else if (tag === 'input' || tag === 'textarea') {
      const v = n.value || '';
      text = 'value=' + (v ? JSON.stringify(v).slice(0, 50) : '(empty)')
           + (n.placeholder ? ' placeholder=' + JSON.stringify(n.placeholder) : '');
    } else if (tag === 'a' || tag === 'button') {
      text = (n.innerText || n.getAttribute('aria-label') || '').trim().slice(0, 60);
    } else {
      text = (n.innerText || n.getAttribute('aria-label') || n.value || '').trim().slice(0, 60);
    }
    return {
      idx: ++i, tag, role: n.getAttribute('role') || '',
      text, id: n.id || '', name: n.getAttribute('name') || '',
      type: n.type || '',
      visible: r.width > 0 && r.height > 0
    };
  };

  const walk = (root) => {
    for (const n of root.querySelectorAll('*')) {
      const tag = n.tagName.toLowerCase();
      const interactive = ['a', 'button', 'input', 'select', 'textarea'].includes(tag)
        || n.getAttribute('role') === 'button';
      if (interactive) els.push(describe(n, tag));
    }
  };

  walk(document);
  // shadow roots abertos
  for (const host of document.querySelectorAll('*')) {
    if (host.shadowRoot) { try { walk(host.shadowRoot); } catch (e) {} }
  }

  const pageText = (document.body ? document.body.innerText : '')
    .replace(/\s+/g, ' ').slice(0, 1200);

  return JSON.stringify({
    url: location.href, title: document.title,
    elements: els, pageText
  });
})()
// v2.3.2: o snapshot mantem TODOS os elementos (visible flag apenas informativa);
// o executor decide actionable por resolveWait. Formularios em etapa/overlay
// (display:none ate a etapa ativa) precisam aparecer na tabela com o estado
// hidden=true para o modelo saber que existem e planejar.
