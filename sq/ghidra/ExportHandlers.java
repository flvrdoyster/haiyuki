import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.address.*;
import java.io.*;
import java.nio.file.*;

public class ExportHandlers extends GhidraScript {
    public void run() throws Exception {
        for (String l : Files.readAllLines(Paths.get(getScriptArgs()[0]))) {
            if (l.trim().isEmpty()) continue;
            Address a = toAddr(Long.parseLong(l.trim(), 16));
            if (getFunctionAt(a) == null) {
                disassemble(a);
                createFunction(a, null);
            }
        }
        DecompInterface di = new DecompInterface();
        di.openProgram(currentProgram);
        PrintWriter all = new PrintWriter(new File(getScriptArgs()[1]));
        for (String l : Files.readAllLines(Paths.get(getScriptArgs()[0]))) {
            if (l.trim().isEmpty()) continue;
            Function f = getFunctionAt(toAddr(Long.parseLong(l.trim(), 16)));
            if (f == null) continue;
            DecompileResults r = di.decompileFunction(f, 60, monitor);
            all.println("// ==== " + f.getName() + " @ " + f.getEntryPoint());
            if (r.decompileCompleted()) all.println(r.getDecompiledFunction().getC());
            else all.println("// FAILED: " + r.getErrorMessage());
        }
        all.close();
    }
}
