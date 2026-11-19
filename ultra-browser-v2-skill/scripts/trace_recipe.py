"""A008: extração determinística, por evidência executada, sem judge/modelo."""
import copy
import hashlib
import json
from pathlib import Path

ACTIONS = {'type','click','select','press','upload','navigate','reload','wait'}
IDENTITY = ('id','label','name','role','scope','tag')


def strict_json(text):
    def pairs(items):
        obj={}
        for key,value in items:
            if key in obj:raise ValueError('duplicate JSON key: '+key)
            obj[key]=value
        return obj
    return json.loads(text,object_pairs_hook=pairs,
                      parse_constant=lambda v: (_ for _ in ()).throw(ValueError('invalid constant '+v)))


def payload(value):
    return strict_json(value) if isinstance(value,str) else value


def extract(trace_path, goal=''):
    path=Path(trace_path);data=path.read_bytes();text=data.decode('utf-8-sig')
    # Compatibilidade com prefixo stdout de uma linha, sem garimpar objetos em
    # texto livre nem aceitar dois documentos/JSON trailing.
    start=next((i for i,line in enumerate(text.splitlines(keepends=True)) if line.lstrip().startswith('{')),None)
    if start is None:raise ValueError('trace without JSON object')
    document=strict_json(''.join(text.splitlines(keepends=True)[start:]))
    if not isinstance(document,dict):raise ValueError('trace must be object')
    if document.get('steps') and document.get('cycles'):raise ValueError('ambiguous mixed trace')
    field='cycles' if document.get('mode')=='batch' or document.get('cycles') else 'steps'
    entries=document.get(field)
    if not isinstance(entries,list):raise ValueError('trace entries must be list')
    source=dict(path=str(path.resolve()),sha256=hashlib.sha256(data).hexdigest(),format='batch' if field=='cycles' else 'single',
                model=document.get('model'),url=document.get('url'),mode=document.get('mode','single'))
    result=dict(version='2.6-extraction-1',intent=goal or document.get('goal',''),source_trace=str(trace_path),
                native_ops=[],notes=[],provenance=dict(source=source,operations=[],excluded=[]),
                verification=dict(source_result=document.get('result'),observations=[],state='recorded-not-revalidated'))
    def exclude(pointer,reason):result['provenance']['excluded'].append(dict(source=pointer,reason=reason))
    for entry_index,entry in enumerate(entries):
        prefix=f'/{field}/{entry_index}'
        if not isinstance(entry,dict):exclude(prefix,'invalid entry');continue
        verification={k:entry[k] for k in ('verifier','verifier_after_save','verifier_on_abort','verdict') if k in entry}
        if verification:result['verification']['observations'].append(dict(source=prefix,**verification))
        if field=='cycles':
            plan=entry.get('plan');plan_key='plan'
            if not isinstance(plan,list):
                if plan is not None:exclude(prefix+'/plan','invalid plan')
                continue
        else:
            parsed=entry.get('parsed');plan_key='parsed'
            if not isinstance(parsed,dict):continue
            plan=[parsed]
        if 'exec' not in entry:
            for index,act in enumerate(plan):
                if isinstance(act,dict) and act.get('action') not in ('done','blocked'):
                    exclude(prefix+'/'+plan_key+('/'+str(index) if field=='cycles' else ''),'not executed')
            continue
        try:executed=payload(entry['exec'])
        except (ValueError,TypeError):exclude(prefix+'/exec','invalid executor JSON');continue
        if not isinstance(executed,dict):exclude(prefix+'/exec','invalid executor object');continue
        if '_error' in executed or ('error' in executed and executed.get('expected') is not True) or '_rc' in executed and (type(executed['_rc']) is not int or executed['_rc']!=0):
            exclude(prefix+'/exec','executor transport/protocol failure');continue
        envelope='results' in executed
        rows=executed.get('results') if envelope else [executed]
        if not isinstance(rows,list):exclude(prefix+'/exec','invalid results');continue
        indexes=[row.get('i') for row in rows if isinstance(row,dict)]
        if len(indexes)!=len(rows) or any(type(i) is not int or i<0 or i>=len(plan) for i in indexes) or indexes!=list(range(len(rows))):
            exclude(prefix+'/exec','invalid/duplicate/unordered result indexes');continue
        seen=set()
        for row_index,row in enumerate(rows):
            index=row['i'];seen.add(index);act=plan[index]
            action_pointer=prefix+'/'+plan_key+('/'+str(index) if field=='cycles' else '')
            row_pointer=prefix+'/exec'
            decoded_pointer='/results/'+str(row_index) if envelope else ''
            encoding='json-string' if isinstance(entry['exec'],str) else 'object'
            stop=executed.get('stopped_at')
            if stop is not None and (type(stop) is not int or index>stop):
                exclude(action_pointer,'result beyond stopped_at');continue
            if not isinstance(act,dict):exclude(action_pointer,'invalid action');continue
            action=act.get('action')
            if action in ('done','blocked'):continue
            if action in ('assert_text','assert_text_absent','assert_field','expect_blocked'):
                result['verification']['observations'].append(dict(source=action_pointer,execution_source=row_pointer,
                    execution_pointer=decoded_pointer,execution_encoding=encoding,
                    assertion=copy.deepcopy(act),observation=copy.deepcopy(row)))
                continue
            if action not in ACTIONS:exclude(action_pointer,'unsupported action');continue
            declared=act.get('_expect_fail') is True or (index>0 and isinstance(plan[index-1],dict) and plan[index-1].get('action')=='expect_blocked')
            expected=(declared and row.get('expected') is True and
                      (row.get('blocked') is True or row.get('error')=='element not found (waited)'))
            if not expected and (row.get('action')!=action or 'error' in row):
                exclude(action_pointer,'execution action mismatch or failure');continue
            if not expected and action not in ('upload','navigate','reload','wait') and row.get('ok') is not True:
                exclude(action_pointer,'no successful execution');continue
            if not isinstance(row.get('effect',{}),dict):
                exclude(action_pointer,'invalid effect evidence');continue
            if row.get('effect',{}).get('verified') is False and act.get('postcondition') is not None:
                exclude(action_pointer,'declared postcondition failed');continue
            if action in ('upload','navigate','reload','wait'):
                if executed.get('terminal')!=action or stop!=index:
                    exclude(action_pointer,'terminal execution mismatch');continue
                host=entry.get('host') or {}
                if not isinstance(host,dict) or host.get('action')!=action or host.get('completed') is not True:
                    exclude(action_pointer,'terminal host completion not recorded');continue
                if action!='wait' and (type(host.get('rc')) is not int or host['rc']!=0):
                    exclude(action_pointer,'terminal host rc not successful');continue
                if action=='upload' and ('upload-fail' in str(entry.get('upload')) or not str(entry.get('upload','')).strip().startswith('upload-ok')):
                    exclude(action_pointer,'upload not confirmed');continue
            op={'op':action}
            keys = (*IDENTITY,'value','postcondition') if action not in ('wait','navigate','reload') else ('value',)
            for key in keys:
                if key in act:op[key]=copy.deepcopy(act[key])
            if action not in ('wait','navigate','reload') and not any(op.get(k) for k in IDENTITY) and row.get('id'):
                op['id']=row['id']
            if action in ('type','click','select','press','upload') and not any(op.get(k) for k in IDENTITY):
                exclude(action_pointer,'semantic target identity missing');continue
            if action=='upload':
                file=executed.get('file') or op.get('value')
                if not file:exclude(action_pointer,'upload filename missing');continue
                op['value']=file
            if action=='navigate':op['value']=entry['host'].get('url') or op.get('value')
            if expected:op['_expect_fail']=True
            result['native_ops'].append(op)
            result['provenance']['operations'].append(dict(opIndex=len(result['native_ops'])-1,
                action_source=action_pointer,execution_source=row_pointer,execution_pointer=decoded_pointer,
                execution_encoding=encoding,expected_blocked=expected,
                effect=copy.deepcopy(row.get('effect')),transport_rc=executed.get('_rc')))
        for index,act in enumerate(plan):
            if index not in seen and isinstance(act,dict) and act.get('action') not in ('done','blocked'):
                exclude(prefix+'/'+plan_key+('/'+str(index) if field=='cycles' else ''),'planned suffix not executed')
    if result['provenance']['excluded']:
        result['notes'].append('Candidate incomplete: excluded entries require review; no invented actions.')
    return result
