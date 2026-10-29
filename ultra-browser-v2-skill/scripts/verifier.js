// verifier.js — verificadores independentes por CÓDIGO (não modelo).
// Rodar via js(). O modelo dizer "done" NÃO encerra nada sem um destes passar.
// Especificação: {"verify": "<kind>", "args": "<...>"}

(() => {
  const spec = VERIFY_SPEC; // injetado no lugar pelo agent_loop (substitui VERIFY_SPEC)
  const [kind, ...rest] = [spec.kind, spec.args];
  const arg = (spec.args || '').split('|');

  switch (kind) {
    case 'url_contains': {
      return location.href.includes(arg[0]) ? 'PASS: url contains ' + arg[0] : 'FAIL: url=' + location.href;
    }
    case 'text_contains': {
      const t = document.body ? document.body.innerText : '';
      return t.includes(arg[0]) ? 'PASS: text contains ' + arg[0] : 'FAIL: text missing ' + arg[0];
    }
    case 'field_value': {
      // field_value|selector|expected
      const el = document.querySelector(arg[0]);
      if (!el) return 'FAIL: no element ' + arg[0];
      const v = el.value !== undefined ? el.value : el.innerText;
      return (v === arg[1] || v.includes(arg[1])) ? 'PASS: field=' + v : 'FAIL: field=' + v + ' expected=' + arg[1];
    }
    case 'title_contains': {
      return document.title.includes(arg[0]) ? 'PASS: title' : 'FAIL: title=' + document.title;
    }
    default:
      return 'FAIL: unknown verifier ' + kind;
  }
})()
