import sys,re
sys.path.insert(0,'.')
from pe import *
from fn import F
tabs={'B':(0x42e038,16),'10':(0x430790,0x52),'11':(0x42ff70,0x42),'12':(0x430490,0x51),'a0':(0x42f048,8),'20':(0x4443c8,49)}
out=[]
def body(a):
    t=F.get(a)
    if t is None: return None
    t=re.sub(r'\n\s*\n','\n',t)
    t=re.sub(r'\s*if \(\d+ < \*\(\w+ \*\)\(\*\(int \*\)\(param_1 \+ 0x80\) \+ \d\)\) \{\s*DebugBreak\(\);\s*\}','',t)
    lines=t.split('\n')
    return '\n'.join(l for l in lines[3:] if l.strip() and 'undefined' not in l[:12])
for k,(va,n) in tabs.items():
    seen={}
    for i,a in enumerate(table(va,n)):
        if a==0x410bc0: continue
        print('=== %s[%02x] %x'%(k,i,a))
        b=body(a)
        print(b if b else 'NO DECOMP')
