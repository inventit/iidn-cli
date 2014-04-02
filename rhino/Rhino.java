/**
 * Copyright 2014 Inventit Inc.
 */
import javax.script.ScriptContext;
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import java.io.File;
import java.io.FileReader;
import java.util.TimerTask;
import java.net.URL;

public final class Rhino {
	private Rhino() {
	}
	
	public static void main(String[] argv) throws Exception {
		configureWebProxy();
		final ScriptEngineManager manager = new ScriptEngineManager();
		final ScriptEngine engine = manager.getEngineByName("JavaScript");
		final ScriptContext context = engine.getContext();
		context.setAttribute("__dirname", new File(
			Rhino.class.getResource("Rhino.class").toURI()).getParent(),
			ScriptContext.GLOBAL_SCOPE);
		context.setAttribute("argv", argv, ScriptContext.GLOBAL_SCOPE);
		engine.eval(new FileReader(argv[0]));
	}
	
	private static void configureWebProxy() throws java.net.MalformedURLException {
		final String httpProxy = getenv("HTTP_PROXY");
		if (isEmpty(httpProxy)) {
			// no proxy or already configured with -D option
			return;
		}
		final String noProxy = getenv("NO_PROXY");
		setWebProxy("http", new URL(httpProxy));
		if (!isEmpty(noProxy)) {
			System.setProperty("http.nonProxyHosts", noProxy.replaceAll(",", "|"));
		}
		final String httpsProxy = getenv("HTTPS_PROXY");
		if (!isEmpty(httpsProxy)) {
			setWebProxy("https", new URL(httpsProxy));
		}
	}
	
	private static void setWebProxy(String prefix, URL url) {
		System.setProperty(prefix + ".proxyHost", url.getHost());
		System.setProperty(prefix + ".proxyPort", String.valueOf(url.getPort()));
	}
	
	private static boolean isEmpty(String s) {
		if (s == null || s.length() == 0) {
			return true;
		}
		return false;
	}
	
	private static String getenv(String key) {
		String value = System.getenv(key);
		if (isEmpty(value)) {
			value = System.getenv(key.toLowerCase());
		}
		return value;
	}
}
