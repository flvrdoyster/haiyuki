import struct
EXE='/Users/oyster/Library/CloudStorage/OneDrive-개인/Documents/interest/gense/GAME/haiyuki_win_kr/haiyuki.exe'
d=open(EXE,'rb').read()
pe=struct.unpack_from('<I',d,0x3c)[0]
ns=struct.unpack_from('<H',d,pe+6)[0]
osz=struct.unpack_from('<H',d,pe+20)[0]
base=struct.unpack_from('<I',d,pe+24+28)[0]
secs=[]
o=pe+24+osz
for i in range(ns):
    n,vs,va,rs,rp=struct.unpack_from('<8sIIII',d,o+i*40)
    secs.append((n,va,vs,rp,rs))
def off(va):
    r=va-base
    for n,v,vs,rp,rs in secs:
        if v<=r<v+max(vs,rs): return rp+r-v
def u32(va): return struct.unpack_from('<I',d,off(va))[0]
def table(va,n): return [u32(va+4*i) for i in range(n)]
