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


 20211117
-----------------------------------------------------------------------------------------
*/
(() => {

	"use strict";

    const os = require("os");
	const axios = require("axios");

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
					port: this.appPort,
					privateip: ip 
				}
			};
			axios.post( this.url + "/api", data, { timeout: 20000 }
			).then( response => { response.data.succeed || onError(response.data.error);}
			).catch( error => { onError( "Problem with LanNS request: " + error.message );});
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