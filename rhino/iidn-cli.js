/**
 * Copyright 2013 Inventit Inc.
 */

(function() {

	// Convert to JS array from a Java array.
	var array = [];
	for (var i = 0; i < argv.length; i++) {
		array.push(String(argv[i]));
	}

    var scheduler = java.util.concurrent.Executors.newScheduledThreadPool(1);
    var counter = 1; 
    var futures = {};

	// Include in this global scope.
	eval(readContent(__dirname + '/../common.js'));

	main(array);

	// End of Main Script.
	// Rhino/Java specific implementation functions ----------------------

	function log(m) {
		java.lang.System.out.println("[IIDN] " + m);
	}

	function print(m) {
		java.lang.System.out.println(m);
	}

	function exit(code) {
		java.lang.System.exit(code);
	}

	function readContent(path) {
		var input = new java.io.BufferedReader(new java.io.FileReader(path));
		var line = null;
		var content = '';
		try {
			while ((line = input.readLine()) != null) {
				content += line + '\n';
			}
			return content;
		} finally {
			input.close();
		}
	}

	function readRawContent(path) {
		var input = new java.io.FileInputStream(path);
		var out = new java.io.ByteArrayOutputStream();
		var r;
		try {
			while ((r = input.read()) >= 0) {
				out.write(r);
			}
			return out.toByteArray();;
		} finally {
			input.close();
		}
	}
	
	function writeRawContent(path, content) {
		var out = new java.io.FileOutputStream(path);
		try {
			out.write(content, 0, content.length);
			out.flush();
		} finally {
			out.close();
		}
	}

	function prompt(callback) {
		var stdin = new java.io.BufferedReader(new java.io.InputStreamReader(java.lang.System['in']));
		var text = stdin.readLine();
		callback(text.trim());
	}
	
	function promptPassword(callback) {
		var console = java.lang.System.console();
		var charArray = console.readPassword();
		callback(String(new java.lang.String(charArray)));
	}

	function openUrl(url) {
		java.awt.Desktop.getDesktop().browse(new java.net.URI(url));
	}
	
	// JDK-built-in Rhino doesn't have setInterval().
	function setInterval(fn, delay) {
        var id = counter++; 
		// JDK-built-in Rhino cannot enhance a Class but an Interface.
		var r = new java.lang.Runnable() {run: function() {
			if (java.lang.Thread.currentThread().isInterrupted()) {
				// Allow a ScheduledFuture to cancel.
				return;
			}
			fn();
		}};
        futures[id] = scheduler.scheduleWithFixedDelay(
			r, delay, delay, java.util.concurrent.TimeUnit.MILLISECONDS);
        return id;
    }

	// JDK-built-in Rhino doesn't have clearInterval().
	function clearInterval(id) {
		var future = futures[id];
		if (future) {
			future.cancel(true);
			delete futures[id];
		}
    }

	function readUntilCrlf(input) {
		var out = new java.io.ByteArrayOutputStream();
		var r;
		var cr = false
		while ((r = input.read()) >=0) {
			if (r == 0x0d) {
				cr = true;
				continue;
			}
			if (cr) {
				cr == false;
				if (r == 0x0a) {
					break;
				}
			}	
			out.write(r);
		}
		var array = out.toByteArray();
		if (array.length == 0) {
			return null;
		}
		return String(new java.lang.String(array, 'utf-8'));
	}

	// uri, method, type, body, callback, onClose, chunked
	function httpMethod(o) {
		var u = new java.net.URL(o.uri);
		var connection = u.openConnection();
		try {
			connection.setDoOutput(true);
			connection.setDoInput(true);
			connection.setUseCaches(false);
			connection.setRequestMethod(o.method);
			connection.setConnectTimeout(30000);
			connection.setReadTimeout(30000);
			if (o.body) {
				if (o.type) {
					connection.setRequestProperty('Content-Type', o.type);
				}
				var out = new java.io.ByteArrayOutputStream();
				var w;
				if (o.type && ((o.type.indexOf('json') >= 0) || o.type.indexOf('text') >=0 ||
						(o.type == 'application/x-www-form-urlencoded'))) {
					w = new java.io.BufferedWriter(new java.io.OutputStreamWriter(out, 'utf-8'));
				} else {
					// an instant wrapper.
					w = {
						write : function(data) {
							out.write(data, 0, data.length);
						},
						flush : function() {},
						close : function() {}
					};
				}
				writeBody(w, o.type, o.body);
				w.flush();
				w.close();
				var bytes = out.toByteArray();
				// http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=6472250
				connection.setFixedLengthStreamingMode(bytes.length);
				connection.setRequestProperty('Content-Length', bytes.length);
				var os = connection.getOutputStream();
				os.write(bytes, 0, bytes.length);
				os.flush();
				
			} else {
				connection.connect();
			}
			var status = connection.getResponseCode();
			if (status != 200) {
				java.lang.System.err.println('[ERROR] Status:' + status);
				if (o.callback) {
					o.callback(null, status);
				}
				return;
			}
			var contentType = connection.getContentType();
			var isJson = (contentType && contentType.indexOf('json') >= 0);
			var isBin = (contentType && contentType.indexOf('octet-stream') >= 0);
			var input = connection.getInputStream();
			o.buff = '';
			
			do {
				var content = '';
				if (o.chunked) {
					o.buff += readUntilCrlf(input);
					if (!o.chunkSize) {
						o.chunkSize = parseInt(o.buff, 16);
						o.buff = '';
						continue;
					} else {
						o.buff += '\r\n';
					}
					if (o.chunkSize && o.chunkSize <= o.buff.length) {
						content = o.buff.substring(0, o.chunkSize);
						if (o.chunkSize < o.buff.length) {
							o.buff = o.buff.substring(o.chunkSize);
						} else {
							o.buff = '';
						}
						o.chunkSize = null;
					} else {
						// All data doesn't arrive yet.
						continue;
					}
					
				} else if (isBin) {
					var out = new java.io.ByteArrayOutputStream();
					var r;
					while ((r = input.read()) >= 0) {
						out.write(r);
					}
					content = out.toByteArray();
					
				} else {
					var line;
					while ((line = readUntilCrlf(input)) != null) {
						content += line + '\n'
					}
				}
				if (o.callback) {
					if (isJson) {
						// A workaround for missing JSON.parse().
						// https://github.com/douglascrockford/JSON-js/blob/master/json2.js
						var obj = eval('(' + content + ')');
						o.callback(obj, status);
					} else {
						o.callback(content, status);
					}
				}
			} while (o.chunked);
		} catch (e) {
			java.lang.System.err.println('[ERROR]' + e);
			if (o.callback) {
				o.callback();
			}
			if (onClose) {
				onClose();
			}
		} finally {
			connection.disconnect();
			if (o.onClose) {
				o.onClose();
			}
		}
	}
})()
