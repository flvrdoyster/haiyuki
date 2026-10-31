import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.listing.*;
import java.io.*;

public class ExportDecomp extends GhidraScript {
    public void run() throws Exception {
        DecompInterface di = new DecompInterface();
        di.openProgram(currentProgram);
        File dir = new File(getScriptArgs()[0]);
        dir.mkdirs();
        PrintWriter all = new PrintWriter(new File(dir, "all.c"));
        FunctionIterator it = currentProgram.getFunctionManager().getFunctions(true);
        while (it.hasNext()) {
            Function f = it.next();
            DecompileResults r = di.decompileFunction(f, 60, monitor);
            all.println("// ==== " + f.getName() + " @ " + f.getEntryPoint());
            if (r.decompileCompleted()) all.println(r.getDecompiledFunction().getC());
            else all.println("// FAILED: " + r.getErrorMessage());
        }
        all.close();
    }
}
