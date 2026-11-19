"""Frames de estados, create-only. Evidência visual não é judge nem vídeo."""
import copy
from contextvars import ContextVar
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import struct
import zlib

CURRENT = ContextVar('browser_capture', default=None)


def png_valid(data):
    if not isinstance(data, bytes) or not data.startswith(b'\x89PNG\r\n\x1a\n'):
        return False
    pos, chunks = 8, []
    try:
        while pos < len(data):
            length = struct.unpack('>I', data[pos:pos+4])[0]
            kind = data[pos+4:pos+8]; value = data[pos+8:pos+8+length]
            crc = struct.unpack('>I', data[pos+8+length:pos+12+length])[0]
            if len(value) != length or zlib.crc32(kind+value) != crc:return False
            chunks.append((kind,value));pos += length+12
        if pos != len(data) or not chunks or chunks[0][0] != b'IHDR' or len(chunks[0][1]) != 13:return False
        width,height=struct.unpack('>II',chunks[0][1][:8])
        return (width>0 and height>0 and chunks[-1]==(b'IEND',b'')
                and bool(zlib.decompress(b''.join(v for k,v in chunks if k==b'IDAT'))))
    except (ValueError, struct.error, zlib.error):
        return False


def verify_files(report, directory, run_id):
    """Gate independente: não confiar em passed:true ou nome do arquivo."""
    errors=[]
    try:
        if report['schema']!='browser-capture-v1' or report['runId']!=run_id or report['passed'] is not True or report['errors']:
            return ['capture receipt not passed or wrong run']
        frames=report['frames'];root=Path(directory).resolve()
        if not isinstance(frames,list) or not frames:return ['capture has no frames']
        names=set()
        for index,frame in enumerate(frames,1):
            name=frame['file']
            if (not isinstance(name,str) or Path(name).name!=name or '/' in name or '\\' in name
                or name in names or frame['runId']!=run_id or frame['index']!=index):
                errors.append('capture identity/path invalid');continue
            names.add(name);path=root/name
            if path.is_symlink() or path.resolve().parent!=root:
                errors.append('capture escaped directory');continue
            data=path.read_bytes()
            if len(data)!=frame['bytes'] or hashlib.sha256(data).hexdigest()!=frame['sha256'] or not png_valid(data):
                errors.append('capture file invalid: '+name)
    except (OSError,KeyError,TypeError,ValueError) as exc:
        errors.append(type(exc).__name__+': '+str(exc))
    return errors


class Capture:
    def __init__(self,run_id,directory,screenshot):
        self.directory=Path(directory);self.directory.mkdir(exist_ok=False)
        self.screenshot=screenshot;self.finished=False
        self.report=dict(schema='browser-capture-v1',runId=run_id,method='state-frames-png',
                         frames=[],errors=[],passed=False)

    def frame(self,phase):
        if self.finished:
            raise RuntimeError('capture already finalized')
        entry=dict(runId=self.report['runId'],index=len(self.report['frames'])+1,phase=phase,
                   observedAt=datetime.now(timezone.utc).isoformat())
        try:
            data=self.screenshot()
            if not png_valid(data):raise ValueError('capture returned invalid/empty PNG')
            name=f"{entry['index']:05d}.png";path=self.directory/name
            with path.open('xb') as stream:stream.write(data)
            if path.read_bytes()!=data:raise OSError('capture readback mismatch')
            entry.update(file=name,bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
            self.report['frames'].append(entry)
            return True
        except Exception as exc:
            entry['error']=type(exc).__name__+': '+str(exc)
            self.report['errors'].append(entry)
            return False

    def finish(self):
        if not self.finished:
            self.finished=True
            self.report['passed']=bool(self.report['frames']) and not self.report['errors']
            errors=verify_files(self.report,self.directory,self.report['runId'])
            if errors:
                self.report['passed']=False
                self.report['errors'].extend(errors)
            try:
                with (self.directory/'capture.json').open('x',encoding='utf-8',newline='\n') as stream:
                    json.dump(self.report,stream,ensure_ascii=False,indent=2);stream.write('\n')
            except Exception as exc:
                self.report['passed']=False
                self.report['errors'].append('capture receipt write failed: '+str(exc))
        return copy.deepcopy(self.report)
