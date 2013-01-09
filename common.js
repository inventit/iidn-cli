/**
 * Copyright 2012 Inventit Inc.
 */

var IIDN_TERM_OF_SERVICE_URI = 'http://dev.yourinventit.com/files/TERMS.txt';
var MOAT_REST_API_URI = 'https://sandbox.service-sync.com/moat/v1';
var SIGNUP_TIMEOUT_MS = 5 * 60 * 1000;

function main(argvInput) {
	var argv = strip(argvInput);
	var command = resolveCommand(argv);
	var ret = 0;
	if (command == null) {
		log('iidn <COMMAND> [ARGS]');
		log('COMMAND:');
		log(' signup .... Allows you to sign up IIDN. Your OAuth2 account is mandatory.');
		log(' jsdeploy .... Allows you to deploy your MOAT js script package archive.');
		log(' jsundeploy .... Allows you to undeploy your MOAT js script package archive.');
		log(' bindeploy .... Allows you to deploy your binary distribution package.');
		log(' binundeploy .... Allows you to undeploy your binary distribution package.');
		log(' log    .... Allows you to tail the server side MOAT js script logs.');
		log(' tokengen .... Allows you to download the security token for your client application (i.e. Android, OSGi).');
		log(' remove .... Allows you to remove your IIDN account.');
		exit(1);
	} else {
		if (command.validate(argv)) {
			command.perform(argv);
		} else {
			command.help();
			exit(2);
		}
	}
}

function strip(argv) {
	if (argv.length == 0) {
		return argv;
	}
	if (argv[1].match(/iidn-cli.js$/)) {
		argv.shift();
	}
	argv.shift();
	return argv;
}

function resolveCommand(argv) {
	if (argv.length == 0) {
		log('no argument.')
		return null;
	}
	var command = argv[0].toLowerCase() + 'Command';
	try {
		return eval('new ' + command);
	} catch (e) {
		log('unknown command:' + argv[0]);
		return null;
	}
}

function httpGet(uri, callback, onCloseOrEnd, chunked) {
	httpMethod({
		uri: uri,
		method: 'GET',
		type: null,
		body: null,
		callback: callback,
		onClose: onCloseOrEnd,
		chunked: chunked
	});
}

function httpPost(uri, type, body, callback, onCloseOrEnd) {
	httpMethod({
		uri: uri,
		method: 'POST',
		type: type,
		body: body,
		callback: callback,
		onClose: onCloseOrEnd,
		chunked: false
	});
}

function httpPut(uri, type, body, callback, onCloseOrEnd) {
	httpMethod({
		uri: uri,
		method: 'PUT',
		type: type,
		body: body,
		callback: callback,
		onClose: onCloseOrEnd,
		chunked: false
	});
}

function httpDelete(uri, callback, onCloseOrEnd, chunked) {
	httpMethod({
		uri: uri,
		method: 'DELETE',
		type: null,
		body: null,
		callback: callback,
		onClose: onCloseOrEnd,
		chunked: chunked
	});
}

function writeBody(w, type, body) {
	if (typeof(body) == 'string') {
		w.write(body);
	} else if (type && type.indexOf('json') >=0) {
		w.write(JSON.stringify(body));
	} else if (!type || type == 'application/x-www-form-urlencoded') {
		var form = '';
		for (var p in body) {
			if (body.hasOwnProperty(p)) {
				form += escape(p) + '=' + escape(body[p]) + '&';
			}
		}
		w.write(form);
	} else {
		w.write(body);
	}
}

withAuth = (function() {
	var authToken = null;
	this.invoke = function(input, callback) {
		if (authToken) {
			callback(toAuthUrl(input));
		} else {
			var cred = [];
			log('Enter your appId:');
			prompt(function(appId) {
				if (!appId) {
					log('appId is required.');
					exit(20);
				}
				cred.push(appId);
				log('Enter your clientId:');
				prompt(function(clientId) {
					if (!clientId) {
						log('clientId is required.');
						exit(21);
					}
					cred.push(clientId);
					log('Enter your password:');
					prompt(function(password) {
						if (!password) {
							log('password is required.');
							exit(22);
						}
						cred.push(password);
						signIn(cred, function(body, statusCode) {
							if (body) {
								authToken = body.accessToken;
								callback(toAuthUrl(input));
							} else {
								exit(23);
							}
						});
					});
				});
			});
		}
	}
	this.signOut = function(code) {
		if (authToken) {
			httpGet(MOAT_REST_API_URI + '/sys/auth?m=delete&token=' + authToken, null,
				function() {
					authToken = null;
					exit(code);
				}
			);
		} else {
			exit(code);
		}
	}
	function toAuthUrl(input) {
		if (input.indexOf('?') >= 0) {
			return input + '&token=' + authToken;
		} else {
			return input + '?token=' + authToken;
		}
	}
	function signIn(cred, callback) {
		httpGet(MOAT_REST_API_URI + '/sys/auth?a=' + cred[0] + '&u=' + cred[1] + '&c=' + cred[2],
			callback, function(err) {
				if (err) {
					signOut(24);
				}
			});
	}
	return this;
})();

// Undeploy Bin Command
function binundeployCommand() {

	this.perform = function(argv) {
		withAuth.invoke(MOAT_REST_API_URI + '/sys/package/' + argv[1] + '?r=delete',
			function(url) {
				log('Undeploying the distribution package...');
				httpGet(url,
					function(body, statusCode) {
						var deleteUrl = body["delete"];
						if (deleteUrl) {
							var deleteError = false;
							httpDelete(deleteUrl, function(body, statusCode) {
								deleteError = true;
								if (body != null) {
									log('Error. Message:' + body + ', Code:' + statusCode);
								}
								withAuth.signOut(82);
							},
							function() {
								if (!deleteError) {
									log('Removed.');
								}
								withAuth.signOut(80);
							});
						} else {
							log('Did Nothing');
							withAuth.signOut(81);
						}
					}
				);
			}
		);
	}
	
	this.help = function() {
		log('iidn binundeploy <object-file-name>');
	}

	this.validate = function(argv) {
		if (argv.length != 2) {
			return false;
		}
		return true;
	}
	
}

// Deploy Bin Command
function bindeployCommand() {

	this.perform = function(argv) {
		var objectName = argv[1];
		if (objectName.indexOf('/') >= 0) {
			objectName = objectName.substring(objectName.lastIndexOf('/') + 1);
		}
		if (/^[a-zA-Z0-9\.\-_%]*$/.test(objectName) == false) {
			log('Invalid Name => ' + objectName + '. Alphanumeric, period(.), hyphen(-) and underscore(_) are allowed.');
			withAuth.signOut(73);
		} else {
			log('Registering [' + objectName + ']...');
			withAuth.invoke(MOAT_REST_API_URI + '/sys/package/' + objectName + '?r=put',
				function(url) {
					log('Deploying a binary distribution package...');
					httpGet(url,
						function(body, statusCode) {
							if (statusCode == 200) {
								var uploadedError = false;
								httpPut(body['put'], 'application/octet-stream', readRawContent(argv[1]),
									function(body, statusCode) {
										uploadedError = true;
										if (body != null) {
											log('Error. Message:' + body + ', Code:' + statusCode);
										}
										withAuth.signOut(71);
									},
									function() {
										if (!uploadedError) {
											log('A new binary distribution package has been created.');
										}
										withAuth.signOut(70);
									});

							} else {
								log('Done');
								withAuth.signOut(72);
							}
						}
					);
				}
			);
		}
	}
		
	this.help = function() {
		log('iidn bindeploy <path/to/binary/package/file>');
	}

	this.validate = function(argv) {
		if (argv.length != 2) {
			return false;
		}
		return true;
	}
	
}

// Tokengen Command
function tokengenCommand() {

	this.perform = function(argv) {
		var ts = new Date().getTime();
		withAuth.invoke(MOAT_REST_API_URI + '/sys/package/' + argv[1] + '?secureToken=true&genId=' + ts,
			function(url) {
				log('Downloading the secure token for the package ' + argv[1] + ' ...');
				httpGet(url,
					function(body, statusCode) {
						if (statusCode != '200') {
							log('Error. Code:' + statusCode);
							withAuth.signOut(62);
							return;
						}
						var name = ts + '-token.bin';
						writeRawContent(name, body);
						log('Done. The content is saved to ' + name + '.');
						log('YOU NEED TO SIGN THE CONTENT WITH YOUR CERTIFICATE USED FOR SIGNING YOUR APPS.');
						log('You can refer to the following OpenSSL command to sign it. (Enter the private key password if prompted.)');
						log('---------------------------------------------------------------------------------------------------------------------------');
						log('$ openssl smime -sign -in ' + name + ' -out signed.bin -signer your.cert.pem -inkey your.key -nodetach -outform der -binary');
						log('---------------------------------------------------------------------------------------------------------------------------');
						log(' - signed.bin .... the PKCS#7 signed file name');
						log(' - your.cert.pem ... signing certificate name');
						log(' - your.key ... the private key name of the signing certificate');
						log('');
						log('* For Android/Java Developers: JKS (Java Key Store) notice.');
						log('Modify and run the following command to convert .jks file to PKCS#12 file.');
						log('---------------------------------------------------------------------------------------------------------------------------');
						log('$ keytool -importkeystore -srckeystore your-existing.jks -destkeystore your-new.p12 -deststoretype PKCS12');
						log('---------------------------------------------------------------------------------------------------------------------------');
						log('');
						log('Then you can extract the certificate and the private key in it by the following OpenSSL commands.');
						log('---------------------------------------------------------------------------------------------------------------------------');
						log('$ openssl pkcs12 -in your-new.p12 -clcerts -nokeys -out your.cert.pem');
						log('---------------------------------------------------------------------------------------------------------------------------');
						log('$ openssl pkcs12 -in your-new.p12 -nocerts -out your.key');
						log('---------------------------------------------------------------------------------------------------------------------------');
						withAuth.signOut(61);
					},
					function() {
						log('Done');
						withAuth.signOut(60);
					}
				);
			}
		);
	}
	
	this.help = function() {
		log('iidn tokengen <pacakge-name>');
	}

	this.validate = function(argv) {
		if (argv.length != 2) {
			return false;
		}
		return true;
	}
	
}

// Undeploy js Command
function jsundeployCommand() {

	this.perform = function(argv) {
		withAuth.invoke(MOAT_REST_API_URI + '/sys/package/' + argv[1] + '?m=delete',
			function(url) {
				log('Undeploying the MOAT js package...');
				httpGet(url,
					function(body, statusCode) {
						log('Done');
						withAuth.signOut(51);
					},
					function() {
						log('Done');
						withAuth.signOut(50);
					}
				);
			}
		);
	}
	
	this.help = function() {
		log('iidn jsundeploy <pacakge-id>');
	}

	this.validate = function(argv) {
		if (argv.length != 2) {
			return false;
		}
		return true;
	}
	
}

// Deploy js Command
function jsdeployCommand() {

	this.perform = function(argv) {
		withAuth.invoke(MOAT_REST_API_URI + '/sys/package',
			function(url) {
				log('Deploying a MOAT js package...');
				httpPost(url, 'application/zip', readRawContent(argv[1]),
					function(body, statusCode) {
						if (statusCode == 200) {
							log('A new MOAT js package has been created.');
							desc(body);
							withAuth.signOut(40);

						} else if (statusCode == 400) {
							// trying to PUT operation
							log('400 is returned as the package already exists. Trying to update...');
							httpPost(url + '&m=put', 'application/zip', readRawContent(argv[1]),
								function(body, statusCode) {
									if (statusCode == 200) {
										log('The package has been updated.');
										desc(body);
									}
									withAuth.signOut(41);
								}
							);

						} else {
							// Exit Anyway
							log("status:"+statusCode)
							withAuth.signOut(43);
						}
					}
				);
			}
		);
	}
	
	function desc(body) {
		log('Deployed MOAT js package info:');
		log(' package-id(name):' + body.packageJson.name);
		log(' version:' + body.packageJson.version);
		if (body.udatedFiles) {
			log(' updated files:' + body.udatedFiles);
		}
		if (body.registeredFiles) {
			log(' uploaded files:' + body.registeredFiles);
		}
		log('=> OK');
	}
	
	this.help = function() {
		log('iidn jsdeploy <path/to/package/zip/file>');
		log('The file must be zip-archived and contain the package.json.');
	}

	this.validate = function(argv) {
		if (argv.length != 2) {
			return false;
		}
		return true;
	}
	
}

// Log Command
function logCommand() {
	
	this.perform = function(argv) {
		withAuth.invoke(MOAT_REST_API_URI + '/sys/log?t=true',
			function(url) {
				log('Tailing the MOAT js server script log:');
				httpGet(url,
					function(body, statusCode) {
						log(body);
					},
					function() {
						withAuth.signOut(30);
					},
					true // chunked
				);
			}
		);
	}
	
	this.help = function() {
		log('iidn log');
		log('No argument is available.');
	}

	this.validate = function(argv) {
		if (argv.length > 1) {
			return false;
		}
		return true;
	}
}

// Remove Account Command
function removeCommand() {

	this.perform = function(argv) {
		withAuth.invoke(MOAT_REST_API_URI + '/sys/account?m=delete',
			function(url) {
				log('Removing your account...');
				httpGet(url,
					function(body, statusCode) {
						if (statusCode != 200) {
							withAuth.signOut(31);
						} else {
							exit(30);
						}
					},
					function() {
						exit(32);
					}
				);
			}
		);
	}
	
	this.help = function() {
		log('iidn remove');
		log('The command removes your account information on Inventit IoT Developer Network Sandbox server.');
		log('Note that you have to remove the association with this IIDN app manually on your OAuth2 provider site.');
	}

	this.validate = function(argv) {
		if (argv.length > 1) {
			return false;
		}
		return true;
	}
	
}

// Sign-up Command
function signupCommand() {
	var oauth2Provider;
	
	this.perform = function(argv) {
		askTos({
			rejected: function() {
				exit(10);
			},
			accepted: function() {
				signup(oauth2Provider);
			}
		});
	}
	this.help = function() {
		log('iidn signup <OAuth2 Provider>');
		log('OAuth2 Provider:');
		log(' fb     ... Using Facebook Account');
		log(' github ... Using GitHub Account');
	}
	this.validate = function(argv) {
		if (argv.length == 1) {
			return false;
		}
		oauth2Provider = argv[1].toLowerCase();
		switch (oauth2Provider) {
			case 'fb':
			case 'github':
			break;
			default:
			oauth2Provider = null;
			return false;
		}
		return true;
	}

	function askTos(callback) {
		log('Please read and accept the Terms of Service:');
		httpGet(IIDN_TERM_OF_SERVICE_URI, function(content, status) {
			if (status != 200) {
				log('Error! Term of Service is not available. Try later.');
				exit(15);
			} else {
				print(content);
				log('Did you read and accept the terms? (yes/no):');
				prompt(function(text) {
					if (text.toLowerCase() != 'yes') {
						callback.rejected();
					} else {
						callback.accepted();
					}
				});
			}
		});
	}
	
	function signup(oauth2Provider) {
		var signupResult;
		httpGet(MOAT_REST_API_URI + '/sys/oauth2auth?p=' + oauth2Provider + '&t=authorization', onAuthorizationResponse);
		function onAuthorizationResponse(body) {
			if (!body) {
				log('Server is unreachable or not avaialble for now. Try later.');
				exit(12);
			}
			var url = body.authorizationUri;
			log('Opening Browser or you can enter the following URL manually:');
			log(url);
			openUrl(url);

			log('Enter the authorization code:');

			(function() {
				var signupStartedAt = new Date().getTime();
				var id = setInterval(function() {
					var now = new Date().getTime();
					if (signupResult) {
						clearInterval(id);
						welcome(signupResult);
					} else if (now - signupStartedAt >= SIGNUP_TIMEOUT_MS) {
						clearInterval(id);
						log('Sorry. Cannot confirm whther or not your registration was completed. Try again.');
						exit(11);
					}
				}, 5000);
			})();

			prompt(function(text) {
				if (text != '') {
					var get = MOAT_REST_API_URI + '/sys/oauth2auth?p=' + oauth2Provider + '&t=verification&c=' + escape(text);
					httpGet(get,
						function(body, statusCode) {
							if (!body) {
								if (statusCode == 400) {
									log('You already signed up with your email address. Remove the account to register again.');
									exit(13);
								} else {
									log('Server is unreachable or not avaialble for now. Try later.');
									exit(14);
								}
							}
							signupResult = body;
						}
					);
				}
			});
		}
		
		function welcome(info) {
			log('Congratulations! Welcome ' + info.email + ' to Inventit IoT Developer Network Sandbox!');
			log('=====================');
			log('Registration Info:');
			log('  app_id :' + info.appId);
			log('  client_id :' + info.clientId);
			log('  client_secret :' + info.clientSecret);
			log('<NOTICE!> The information is used in order for your application to access IIDN Cloud Sandbox.');
			log('=====================');
			exit(0);
		}
	}
	
}
