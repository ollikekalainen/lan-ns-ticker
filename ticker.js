/*
-----------------------------------------------------------------------------------------
 ticker.js
-----------------------------------------------------------------------------------------
 (c) Olli Kekäläinen

 	Usage:

		const Ticker = require("lan-ns-ticker")

		const ticker = new Ticker({
			url: <string>,						// LanNS Service url
			appName: <string>,
			appDescription: <string>,			// default: ""
			appPort: <number>,
			appUrlPath: <string>,				// default: ""
			appProtocol: <string>,				// default: "http"
			refreshIntervalInSeconds: <number>,	// default: 60, min: 30
			expireTimeInSeconds: <number> 		// default: 120, min: 2*refreshIntervalInSeconds
		});

		ticker.start(
			( error ) => { console.log(error);},
			() => { console.log("LanNs Ticker started"); }
		);


 20190318
-----------------------------------------------------------------------------------------
*/
(() => {

	"use strict";

    const os = require("os");
	const request = require("request");

	class LanNSTicker {

		constructor(params) {
			this.appName = params.appName;
			this.appDescription = params.appDescription||"";
			this.appPort = params.appPort;
			this.appProtocol = params.appProtocol;
			this.appUrlPath = params.appUrlPath;
			this.refreshIntervalInSeconds = Math.max( 30, params.refreshIntervalInSeconds||60 );
			this.url = params.url;
			this.expireTimeInSeconds = Math.max( this.refreshIntervalInSeconds*2, params.expireTimeInSeconds||120 );
			this.timer = undefined;
		}

		start( onError ) {
			if (!this.timer) {
				this.pulse( onError );
				this.timer = setInterval(() => {this.pulse( onError );}, this.refreshIntervalInSeconds * 1000 );
			}
			return this;
		}

		stop() {
			if (this.timer) {
				clearInterval( this.timer );
				this.timer = undefined;
			}
			return this;
		}

		restart( onError, onSuccess ) {
			this.stop().start( onError, onSuccess );
			return this;
		}

		pulse( onError = ((e) => {console.log(e);})) {
			let body = {
				name: "pulse",
				parameters: {
					appname: this.appName,
					description: this.appDescription,
					expiretimeinseconds: this.expireTimeInSeconds,
					hostname: os.hostname(),
					port: this.appPort,
					urlpath: this.appUrlPath,
					protocol: this.appProtocol,
					port: this.appPort,
					privateip: getPrivateIp() 
				}
			};
			try {
				body = JSON.stringify(body);
			}
			catch (error) {
				onError(error);
				return;
			}

			try {
				request.post( 
					{
						url: this.url + "/api",
						body: body,
						headers: {
							"User-Agent": "LanNS Client",
						 	"Content-Type": "text/plain",
							"Content-Length": body.length
						},
						timeout: 20000,
						jar: true,
						followAllRedirects: true,
						followOriginalHttpMethod: true
					}, 
					function ( error, response, body ) {
						if (!error) {
				        	try {
				            	const json = JSON.parse(body);
				            	if (json.succeed === false) {
				            		onError(json.error);
				            	}
				            }
				            catch (error) {
				            	onError(error);
				            }
						}
						else {
							onError( "Problem with LanNS request: " + error.message );
						}
					}
				);
			}
			catch (error) {
				onError(error);
				return;
			}
		}
	}

	function getPrivateIp() {
	    for (let addresses of Object.values( os.networkInterfaces())) {
	        for (let add of addresses) {
	            if(add.address.startsWith("192.168.")) {
	                return add.address;
	            }
	        }
	    }
	}

	module.exports = LanNSTicker;

})();