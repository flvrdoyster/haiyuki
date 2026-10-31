import re,sys
S='/private/tmp/claude-501/-Users-oyster-GitHub-ataho/1f509044-936b-4141-a546-b6b559c1d757/scratchpad/summ.txt'
t=open(S).read().split('=== ')[1:]
pre=sys.argv[1]; lim=int(sys.argv[2])
for blk in t:
    h,_,b=blk.partition('\n')
    if not h.startswith(pre+'['): continue
    b=re.sub(r'\*\(int \*\)\(param_1 \+ 0x80\)','PC',b)
    b=re.sub(r'param_1\[0x20\]','PC',b)
    for pat,r in [(r'\(uint\)\*\(byte \*\)\(PC \+ (\d)\)',r'b\1'),(r'\(uint\)\*\(ushort \*\)\(PC \+ (\d)\)',r'w\1'),(r'\*\(ushort \*\)\(PC \+ (\d)\)',r'w\1'),(r'\*\(byte \*\)\(PC \+ (\d)\)',r'b\1'),(r'\*\(u?int \*\)\(PC \+ (\d)\)',r'd\1'),(r'\*\(undefined\d \*\)\(PC \+ (\d)\)',r'd\1')]:
        b=re.sub(pat,r,b)
    b=re.sub(r'^\s*(undefined\d|bool|int|uint|char|byte|LPCSTR|DWORD|ushort)[^;]*;\s*','',b)
    b=re.sub(r'(?m)^\s*(undefined\d|bool|int|uint|char) [^=;(]*;\s*$','',b)
    b=re.sub(r'\s+',' ',b)
    b=b.replace('PC = PC + 4; return; }','ADV4').replace('PC = PC + 8; return; }','ADV8').replace('PC = PC + 0xc; return; }','ADV12')
    print(h,b[:lim])
