# lan-ns-ticker

Javascript client that notifies [LanNS service](https://github.com/ollikekalainen/lan-ns/) at specified intervals that the web server / service on the local network is running.


## Installation

npm install lan-ns-ticker


## Usage

### Initialization

	const Ticker = require("lan-ns-ticker");
	const ticker = new Ticker(options);
    

### Options

    url: <string>                       LanNS Service url
    appName: <string>
    appDescription: <string>            default: ""
    appPort: <number>
    appUrlPath: <string>                default: ""
    appProtocol: <string>               default: "http"
    refreshIntervalInSeconds: <number>  default: 60, min: 30
    expireTimeInSeconds: <number>       default: 120, min: 2*refreshIntervalInSeconds
     

### Methods

    start( onError )
        onError  function(error)
	    
        Starts the ticker object to sending notifications to LanNS service with specified intervals.
        
    stop()
        Stops the ticker notifications.


### Example

	const Ticker = require("lan-ns-ticker")
    new Ticker({
        url: "https://www.mylannsservice.net:3003",
        appName: "Musa",
        appDescription: "Musa Music Player",
        appPort: 3001,
        appProtocol: "http",
        appUrlPath: "",
        refreshIntervalInSeconds: 60,
        expireTimeInSeconds: 180
    }).start(( error ) => { console.log( error ); });



