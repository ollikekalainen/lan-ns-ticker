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
			expireTimeInSeconds: <number>, 		// default: 120, min: 2*refreshIntervalInSeconds
    		networkInterfaceFilter: <string>    // default: "", e.g. "Local Area Connection" (Usefull when excluding 
    											// private IP addresses for virtual Ethernet adapters. Can be also
    											// a semicolon-separated list of interface names.)
		});

		ticker.start(
			( error ) => { console.log(error);},
			() => { console.log("LanNs Ticker started"); }
		);


 	Releases:

		1.0.4
			The use of the Axios package was replaced by using the native request function 
			of the node.js HTTP and HTTPS interfaces.

		1.0.3
			Added networkInterfaceFilter option.

		1.0.2
			The outdated Request package was discarded and Axios was introduced instead

		1.0.1
			LanNS Ticker does not send a pulse request to the LanNS server when 
			a private IP address is not provided.


 20231031
-----------------------------------------------------------------------------------------
*/
(() => {

	"use strict";

    const os = require("os");
	const OkRequest = require("./lib/ok-request");

	class LanNSTicker {

		constructor(params) {
			this.appName = params.appName;
			this.appDescription = params.appDescription||"";
			this.appPort = params.appPort;
			this.appProtocol = params.appProtocol||"http";
			this.appUrlPath = params.appUrlPath;
			this.networkInterfaceFilter = params.networkInterfaceFilter||"";
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
			const ip = this.#solvePrivareIp();
			if (!ip) {
				return;
			}
			const data = {
				name: "pulse",
				parameters: {
					appname: this.appName,
					description: this.appDescription,
					expiretimeinseconds: this.expireTimeInSeconds,
					hostname: os.hostname(),
					port: this.appPort,
					urlpath: this.appUrlPath,
					protocol: this.appProtocol,
					privateip: ip 
				}
			};
			this.#send( onError, () => {}, data );
		}

		#send( onError, onSuccess, data ) {
			new OkRequest({ url: this.url + "/api" }).post(
				(error) => { onError( "Problem with LanNS request: " + error.message );}, 
				( response, data ) => { 
					try {
						data = JSON.parse(data);
					}
					catch (error) {
						data.error = error;
						data.succeed = false;
					}
					if (data.succeed) 
						onSuccess();
					else {
						onError(data.error);
					}
				},
				JSON.stringify(data)
			);
		}

		#solvePrivareIp() {
			let address;
			let filter = this.networkInterfaceFilter.trim();
			filter && (filter = filter.split(";"));
			const isValid = name => !filter || !!filter.find(filter => name.startsWith(filter.trim()));  
			let i = 0;
			Object.entries( os.networkInterfaces()).forEach(([name,interfaces]) => { 
				if (!address && isValid(name)) {
					const iface = interfaces.find( iface => iface.address.startsWith("192.168."));
					iface && (address = iface.address);
				}
			});
			return address;
		}
	}

	module.exports = LanNSTicker;

})();