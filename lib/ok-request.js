/*
---------------------------------------------------------------------------------------------------
 ok-request

 Copyright by Olli Kekäläinen




 20231030
---------------------------------------------------------------------------------------------------

	Module ok-request exports the OkRequest class providing a simple and easy way to make 
	HTTP requests. It handles automatically redirections (status codes 301 and 302). 


	Initialization:

		new OkRequest(params) 

			params - object, default {}
				port - number, defaukt valus is 80 for HTTP and 443 for HTTPS 
					  	(if the URL string contains a port number, tha value of the port 
					  	property is overwritten by it)
				url - string

	Methods:

		get( onError, onSuccess, requestOptions )

			onError - function(Error)

			onSuccess - function( response, data )
				response - node.js HttpResponse
				data - string

			requestOptions - object, default {}


		post( onError, onSuccess, requestOptions, params )

			onError - function(Error)

			onSuccess - function( response, data )
				response - node.js HttpResponse
				data - string

			body - string|object - if body is passed as an object, it is converted to JSON object
			
			encoding - string, default value is "utf8"

			requestOptions - object, default {}


		request( onError, onSuccess, requestOptions, params )

			onError - function(Error)

			onSuccess - function( response, data )
				response - node.js HttpResponse
				data - string

			requestOptions - object, default {}

			params - object, default {}
				body - string|object - if body is passed as an object, it is converted to JSON object
				transferEncoding - string, default value is "utf8"




	Example:

		const body = {
		    "name": "getTestServices",
		    "parameters": {},
		    "version": 1,
		    "slot": "public"
		};
		new OkRequest({ url: "https://www.testit.com/test/service" }).post(
			(error) => { console.log(error);}, 
			(response, data) => { console.log(data); },
			JSON.stringify(body)
		);


 --------------------------------------------------------------------------------------------------
*/
class OkRequest {
	#params;
	constructor( params = {}) {
		this.#params = params;
	}

	get( onError, onSuccess, requestOptions = {} ) {
		this.#request( 
			onError, 
			onSuccess, 
			Object.assign( requestOptions, { method: "get" })
		);
	}

	post( onError, onSuccess, body, encoding, requestOptions = {}  ) {
		this.#request( 
			onError, 
			onSuccess, 
			Object.assign( requestOptions, { method: "post" }),
			{ body: body, transferEncoding: encoding }
		);
	}

	request( onError, onSuccess, requestOptions = {}, params = {} ) {
		this.#request( onError, onSuccess, requestOptions = {}, params = {});
	}

	get #port() {
		return this.#params.port||(this.#protocol == "http:" ? 80 : 443);
	}

	get #protocol() {
		return this.#url.split("://")[0] + ":";
	}

	get #url() {
		return this.#params.url;
	}

	#getHeaderValue( headers, name ) {
		name = (name+"").toLowerCase();
		const key = Object.keys(headers).find((key) => { return key.toLowerCase() == name; });
		return key ? headers[key] : undefined;
	}

	#onError( onError, onSuccess, error, properties = {}) {
		if (typeof error !== "object") {
			error =  new Error(error);
		}
		Object.entries(properties).forEach(([name,value]) => { error[name] = value; });
		onError( error);
	}

	#onResponse( onError, onSuccess, response ) {
		const data = [];
		response.on('data', (chunk) => { data.push(chunk);});
		response.on('end', () => {
			onSuccess( response, Buffer.concat(data).toString() );
		});
	}

	#request( onError, onSuccess, requestOptions = {}, params = {}, url ) {

		this.#validateUrl( onError, () => {
			const options = Object.assign({
				method: "get",
				port: this.#port,
				protocol: this.#protocol
			}, requestOptions );
			const httpModule = require( options.protocol.split(":")[0]);
			const headers = requestOptions.headers||{};

			const request = httpModule.request( url||this.#url, options, (response) => { 
				if(response.statusCode < 300) {
					this.#onResponse( onError, onSuccess, response );
				}
				else if(response.statusCode == 301 || response.statusCode == 302) {
					this.#request( 
						onError, 
						onSuccess, 
						requestOptions, 
						params, 
						response.headers.location 
					);
				}
				else if(response.statusCode >= 400) {
					this.#onError( 
						onError, 
						onSuccess, 
						"E_STATUS_" + response.statusCode, 
						{ 
							statusCode: response.statusCode,
							statusMesssage: response.statusMesssage 
						}
					);
				}
				else {
					this.#onError( 
						onError, 
						onSuccess, 
						"E_UNHANDLED_STATUSCODE", 
						{ 
							statusCode: response.statusCode,
							statusMesssage: response.statusMesssage,
							response: response
						}
					);
				}
			});

			this.#getHeaderValue( headers, "Connection" ) 
			  || request.setHeader( "Connection", "keep-alive" );

			request.on( "error", (error) => { this.#onError( onError, onSuccess, error )});

			if (options.method.toLowerCase() == "post" && params.body) {
				const body = typeof params.body == "object"
					? JSON.stringify(params.body)
					: params.body;
				request.setHeader( "Content-Length", body.length );
				this.#getHeaderValue( headers, "Content-Type" ) 
					|| request.setHeader( "Content-Type", "text/plain" );
				request.write( body, params.transferEncoding || "utf8" );
			}
			request.end();
		});
		return this;
	}

	#validateUrl( onError, onSuccess ) {
		if (this.#params.url && !this.#params.url.match( /^http(:|s:)/g )) {
			this.#params.url = "http://" + this.#params.url;
		}
		try {
			const url = new URL(this.#params.url);
			url.port && (this.#params.port = url.port);
			onSuccess();
		}
		catch (error) {
			onError(error);
		}
	}
}


module.exports = OkRequest;

