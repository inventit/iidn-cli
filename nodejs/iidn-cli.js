#!/usr/bin/env node

/**
 * Copyright 2012 Inventit Inc.
 */

(function() {

	// Include in this global scope.
	eval(readContent(__dirname + '/../common.js'));

	main(process.argv);

	// End of Main Script.
	// Node.js specific implementation functions ----------------------

	function log(m) {
		console.log("[IIDN] " + m);
	}

	function print(m) {
		console.log(m);
	}

	function exit(code) {
		process.exit(code);
	}

	function readContent(path) {
		return readRawContent(path).toString();
	}

	function readRawContent(path) {
		var fs = require('fs');
		var content = fs.readFileSync(path);
		return content;
	}

	function writeRawContent(path, content) {
		var fs = require('fs');
		fs.writeFileSync(path, content);
	}

	function prompt(callback) {
		process.stdin.resume();
		process.stdin.setEncoding('utf8');
		process.stdin.once('data', function(data) {
			callback(data.toString().trim());
		});
	}

	function promptPassword(callback) {
		process.stdin.resume();
		process.stdin.setEncoding('utf8');
		process.stdin.setRawMode(true);
		var password = '';
		process.stdin.on('data', function(c) {
			var l = c.toString();
			switch (l) {
			case '\n':
			case '\r':
			case '\u0004':
				process.stdin.setRawMode(false);
				process.stdin.pause();
				process.stdout.write('\n');
				callback(password);
				break;

			case '\u0003':
				process.stdin.setRawMode(false);
				process.stdin.pause();
				process.stdout.write('\n');
				callback(null);
				break;

			default:
				password += l;
			}
		});
	}

	function openUrl(url) {
		var spawn = require('child_process').spawn;
		spawn('open', [url]);
	}

	// uri, method, type, body, callback, onClose, chunked
	function httpMethod(o) {
		var url = require('url');
		var urlObj = url.parse(o.uri);
		var http = (urlObj.protocol == 'https:') ? require('https') : require('http');
		var options = {
			hostname: urlObj.hostname,
			port: urlObj.port,
			path: urlObj.path,
			method: o.method
		};
		if (o.type) {
			options.headers = {
				'Content-Type' : o.type
			}
		}
		o.buff = '';
		var req = http.request(options, function(res) {
			res.setEncoding('utf8');
			res.on('data', function(chunk) {
				var skipCallback = false;
				var content = chunk;
				if (o.chunked) {
					o.buff += content;
					content = '';
					var crlf;
					while ((crlf = o.buff.indexOf('\r\n')) >= 0) {
						skipCallback = false;
						if (!o.chunkSize && crlf >= 0) {
							o.chunkSize = parseInt(o.buff.substring(0, crlf), 16);
							o.buff = o.buff.substring(crlf + 2); // truncate size
							if (o.buff.length == 0) {
								// no more chars
								skipCallback = true;
							}
						}
						if (o.chunkSize && o.chunkSize <= o.buff.length) {
							content += o.buff.substring(0, o.chunkSize);
							if (o.chunkSize < o.buff.length) {
								// trim
								o.buff = o.buff.substring(o.chunkSize).replace(/\s+$/,'');
							} else {
								o.buff = '';
							}
							o.chunkSize = null;
						} else {
							// All data doesn't arrive yet.
							skipCallback = true;
						}
					}
				}
				if (!skipCallback && o.callback) {
					var contentType = res.headers['content-type'];
					if (contentType && contentType.indexOf('json') >= 0) {
						o.callback(JSON.parse(content), res.statusCode);
					} else {
						o.callback(content, res.statusCode);
					}
				}
			});
			if (o.onClose) {
				res.on('close', o.onClose);
				res.on('end', o.onClose);
			}
			if (res.statusCode != 200) {
				console.error('[ERROR] Status:'+ res.statusCode);
				if (o.callback) {
					o.callback(null, res.statusCode);
				}
			}
		});
		if (o.body) {
			writeBody(req, o.type, o.body);
		}
		req.end();
		req.on('error', function(e) {
			console.error('[ERROR]' + e);
			if (o.callback) {
				o.callback();
			}
		});
	}

})()
