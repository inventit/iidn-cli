/**
 * Copyright 2013 Inventit Inc.
 */
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import java.io.File;
import java.io.FileReader;
import java.util.TimerTask;

public final class Rhino {
	private Rhino() {
	}
	
	public static void main(String[] argv) throws Exception {
		final ScriptEngineManager manager = new ScriptEngineManager();
		final ScriptEngine engine = manager.getEngineByName("JavaScript");
		final ScriptContext context = engine.getContext();
		context.setAttribute("__dirname", new File(
			Rhino.class.getResource("Rhino.class").toURI()).getParent(),
			ScriptContext.GLOBAL_SCOPE);
		context.setAttribute("argv", argv, ScriptContext.GLOBAL_SCOPE);
		engine.eval(new FileReader(argv[0]));
	}
}
