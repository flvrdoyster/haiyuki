import sys,re
src=open('/Users/oyster/GitHub/haiyuki-re/extracted/sq/ghidra/decomp/all.c',encoding='utf8',errors='replace').read()+open('/Users/oyster/GitHub/haiyuki-re/extracted/sq/ghidra/decomp/handlers.c',encoding='utf8',errors='replace').read()
parts=re.split(r'^// ==== ',src,flags=re.M)
F={}
for p in parts[1:]:
    m=re.match(r'(\w+) @ ([0-9a-f]+)',p)
    F[int(m.group(2),16)]=p
if __name__=='__main__':
    for a in sys.argv[1:]:
        a=int(a,16); print(F.get(a,'?? %x'%a).strip()); print()
