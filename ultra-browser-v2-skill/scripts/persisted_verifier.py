"""Verifier público T1 pós-reload. Não lê judge, runs privados ou providers."""
import json
from pathlib import Path
import re
import time
from urllib.parse import urlsplit
import uuid

FIELDS=frozenset(('id','runId','title','email','type','priority','responsible','requiresEnvironment','environment'))


def strict_json(text):
    def pairs(items):
        result={}
        for key,value in items:
            if key in result:raise ValueError('duplicate JSON key: '+key)
            result[key]=value
        return result
    def invalid(value):raise ValueError('invalid JSON constant: '+value)
    return json.loads(text,object_pairs_hook=pairs,parse_constant=invalid)


def load_contract(raw):
    cfg=strict_json(Path(raw[1:]).read_text(encoding='utf-8') if raw.startswith('@') else raw)
    if not isinstance(cfg,dict) or set(cfg)-{'version','url','fields','binding','attachment','timeout_ms'}:raise ValueError('invalid contract keys')
    if type(cfg.get('version')) is not int or cfg['version']!=1:raise ValueError('invalid contract version')
    parsed=urlsplit(cfg.get('url',''))
    if parsed.scheme not in ('http','https') or not parsed.netloc or parsed.username or parsed.password:raise ValueError('absolute public task URL required')
    fields=cfg.get('fields')
    if not isinstance(fields,dict) or set(fields)!=FIELDS or any(not isinstance(v,str) or (not v and k!='environment') for k,v in fields.items()):raise ValueError('complete scalar fields required')
    if fields['requiresEnvironment'] not in ('true','false'):raise ValueError('boolean display must be true/false')
    binding=cfg.get('binding')
    if not isinstance(binding,dict) or set(binding)!={'demand'} or not isinstance(binding['demand'],str) or not binding['demand']:raise ValueError('complete demand binding required')
    att=cfg.get('attachment')
    if not isinstance(att,dict) or set(att)!={'filename','bytes','sha256','href','download'}:raise ValueError('complete attachment required')
    if any(not isinstance(att[k],str) or not att[k] for k in ('filename','sha256','href','download')):raise ValueError('invalid attachment strings')
    if type(att['bytes']) is not int or att['bytes']<0 or not re.fullmatch('[0-9a-f]{64}',att['sha256']):raise ValueError('invalid attachment size/hash')
    if not att['href'].startswith('/') or att['href'].startswith('//') or '\\' in att['href']:raise ValueError('same-origin absolute path required')
    timeout=cfg.get('timeout_ms',5000)
    if type(timeout) is not int or not 0<=timeout<=10000:raise ValueError('invalid timeout')
    return cfg


OBSERVE_JS="""(async () => {
  /* UB2_PERSIST_OBSERVE */
  const cfg = __CFG__;
  const ready = document.readyState === 'complete' && location.href === cfg.url &&
    performance.timeOrigin !== __BEFORE__ && !window.__ub2_verify_reload &&
    performance.getEntriesByType('navigation')[0]?.type === 'reload';
  const records = Array.from(document.querySelectorAll('#saved > dl'));
  const links = Array.from(document.querySelectorAll('#saved > a'));
  const out = {ready, url:location.href, timeOrigin:performance.timeOrigin,
    navigationType:performance.getEntriesByType('navigation')[0]?.type,
    recordCount:records.length, linkCount:links.length};
  if (!ready || records.length !== 1 || links.length !== 1) return out;
  out.pairs = Array.from(records[0].children).filter(e => e.tagName === 'DT').map(e =>
    [e.textContent, e.nextElementSibling?.tagName === 'DD' ? e.nextElementSibling.textContent : null]);
  out.structureValid = records[0].children.length === out.pairs.length * 2 &&
    Array.from(records[0].children).every((e,i) => e.tagName === (i%2 ? 'DD' : 'DT'));
  const a=links[0]; out.link={href:a.getAttribute('href'),download:a.getAttribute('download')};
  if (out.link.href !== cfg.attachment.href || out.link.download !== cfg.attachment.download ||
      new URL(a.href).origin !== location.origin) return {...out,error:'attachment link mismatch'};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(), cfg.timeout_ms ?? 5000);
  try {
    const r=await fetch(a.href,{cache:'no-store',credentials:'same-origin',redirect:'error',signal:controller.signal});
    if (!r.ok) return {...out,error:'attachment HTTP '+r.status};
    const data=await r.arrayBuffer();
    const hash=await crypto.subtle.digest('SHA-256',data);
    out.download={bytes:data.byteLength,sha256:Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join('')};
    return out;
  } catch(e) {return {...out,error:'attachment read failed: '+String(e)};}
  finally {clearTimeout(timer);}
})()"""


def observe(harness,expr):
    code="import json as _j\nprint('UB2VERIFY ' + _j.dumps(js("+json.dumps(expr)+")))"
    result=harness(code,timeout=15)
    if result.get('rc')!=0:raise ValueError('harness rc != 0')
    payloads=[line[10:] for line in (result.get('out') or '').splitlines() if line.startswith('UB2VERIFY ')]
    if len(payloads)!=1:raise ValueError('one structured verifier payload required')
    obj=strict_json(payloads[0])
    if not isinstance(obj,dict):raise ValueError('verifier payload is not object')
    return obj


def compare(cfg,observation):
    mismatches=[];actual={}
    if observation.get('structureValid') is not True:return ['record.structure invalid']
    pairs=observation.get('pairs')
    if not isinstance(pairs,list):return ['record.pairs missing']
    for pair in pairs:
        if not isinstance(pair,list) or len(pair)!=2 or not all(isinstance(v,str) for v in pair):return ['record pair invalid']
        key,value=pair
        if key in actual:return ['record duplicate key: '+key]
        actual[key]=value
    expected=dict(cfg['fields'],**cfg['binding'])
    if set(actual)!=set(expected)|{'attachment'}:mismatches.append('record.keys')
    for key,value in expected.items():
        if actual.get(key)!=value:mismatches.append('record.'+key)
    try:
        meta=strict_json(actual.get('attachment',''))
        want={k:cfg['attachment'][k] for k in ('filename','bytes','sha256')}
        if not isinstance(meta,dict) or set(meta)!=set(want):mismatches.append('attachment.keys')
        else:
            for key,value in want.items():
                if type(meta[key]) is not type(value) or meta[key]!=value:mismatches.append('attachment.'+key)
    except (ValueError,TypeError):mismatches.append('attachment.invalid')
    for key in ('href','download'):
        if observation.get('link',{}).get(key)!=cfg['attachment'][key]:mismatches.append('link.'+key)
    for key in ('bytes','sha256'):
        got=observation.get('download',{}).get(key);want=cfg['attachment'][key]
        if type(got) is not type(want) or got!=want:mismatches.append('download.'+key)
    return mismatches


def verify_complete(raw,harness):
    detail=dict(passed=False,kind='persisted_json',reloadConfirmed=False)
    try:
        cfg=load_contract(raw)
        token=uuid.uuid4().hex
        before=observe(harness,"(() => { /* UB2_PERSIST_BEFORE */ window.__ub2_verify_reload="+json.dumps(token)+"; return {url:location.href,timeOrigin:performance.timeOrigin}; })()")
        detail['before']=before
        if before.get('url')!=cfg['url'] or type(before.get('timeOrigin')) not in (int,float):raise ValueError('initial page identity invalid')
        request=observe(harness,"(() => { /* UB2_RELOAD_REQUEST */ location.reload(); return {requested:true}; })()")
        if request.get('requested') is not True:raise ValueError('reload request not confirmed')
        expr=OBSERVE_JS.replace('__CFG__',json.dumps(cfg,ensure_ascii=False)).replace('__BEFORE__',json.dumps(before['timeOrigin']))
        deadline=time.monotonic()+cfg.get('timeout_ms',5000)/1000
        while True:
            observation=observe(harness,expr);detail['observation']=observation
            if observation.get('error'):raise ValueError(observation['error'])
            if observation.get('url')!=cfg['url']:raise ValueError('page URL changed')
            if any(type(observation.get(k)) is not int or observation[k]<0 for k in ('recordCount','linkCount')):raise ValueError('invalid record/link counts')
            if observation.get('recordCount',0)>1 or observation.get('linkCount',0)>1:raise ValueError('ambiguous persisted record/link')
            if observation.get('ready') is True and observation.get('recordCount')==1 and observation.get('linkCount')==1:
                detail['reloadConfirmed']=True;detail['mismatches']=compare(cfg,observation)
                detail['passed']=not detail['mismatches'];return detail
            if time.monotonic()>=deadline:raise ValueError('reload/record readiness timeout')
            time.sleep(min(.05,max(0,deadline-time.monotonic())))
    except Exception as exc:
        detail['error']=type(exc).__name__+': '+str(exc)
    return detail
