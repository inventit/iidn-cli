Inventit IoT Developer Network (IIDN) Command Line Interface Tool
===
iidn-cli is a command line tool offering you to interact with IIDN sandbox.

## What iidn-cli offers
The tool enables you:

* to sign up to IIDN sandbox with your OAuth2 account such as [Facebook](http://www.facebook.com/) and [GitHub](https://github.com).
* to upload your [MOAT js](http://dev.yourinventit.com/guides/moat-iot/moat-js) server side applications to the sandbox.
* to tail a [MOAT js](http://dev.yourinventit.com/guides/moat-iot/moat-js) server side application log.
* to download a secure token for you to sign it with your application certificate private key and embed it to your application.
  (The gateway application uses the signed secure token for verification as well.)

## Prerequisites
The tool requires one of the following runtimes:

* Node.js, v0.8.8+
* Sun/Oracle/Apple JDK, 1.6+ (Not a JRE. OpenJDK may work though not confirmed.)

## Installation

Check out the source code with the git command.

	mkdir -p path/to/iidn
	cd path/to/iidn
	git clone git:git@github.com:inventit/iidn-cli.git

Then run the following command:

	sh ./iidn [COMMAND HERE]

## Get Started

See [the tutorial](http://dev.yourinventit.com/guides/get-started) to learn more.

## Source Code License

All program source codes are available under the MIT style License.

The use of IIDN service requires [our term of service](http://dev.yourinventit.com/legal/term-of-service).

Copyright (c) 2013 Inventit Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Change History

0.2.2 : January 9, 2013  

* Fixes an issue where binary download command (sysdownload) generates corrupted content file because of failure of handling chunked binary data

0.2.1 : January 9, 2013  

* Updates the copyright year

0.2.0 : January 9, 2013  

* Changing deploy/undeploy commands to deployjs/undeployjs
* Adds new commands, deploybin/undeploybin for deploying/undeploying arbitrary distribution application packages for devices/gateways
* Adds a new command 'sysdownload' allowing users to download packages managed by the sandbox server

0.1.0 : December 10, 2012

* Initial Release.
