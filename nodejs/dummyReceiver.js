var net = require('net');
var moment = require('moment');
var HOST = '0.0.0.0';
var PORT = 1337;

//test latency purpose
var messageReceived = 0;
var data = [];

function writeToFile() {
	fs.writeFile(
    	'P2P_latency_result',
	    JSON.stringify(data),
	    function (err) {
	        if (err) {
	            console.error('Crap happens');
	        }
	    }
	);
}


// Create a server instance, and chain the listen function to it
// The function passed to net.createServer() becomes the event handler for the 'connection' event
// The sock object the callback function receives UNIQUE for each connection
net.createServer(function(sock) {
    
    // We have a connection - a socket object is assigned to the connection automatically
    console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
    
    // Add a 'data' event handler to this instance of socket
    sock.on('data', function(data) {
        
        //console.log('DATA ' + sock.remoteAddress + ': ' + data);
        var sentTime = parseInt(data);
        var currentTime = moment().format('x');
        var latency = currentTime - sentTime;
        console.log("Latency: " + latency);

        if (messageReceived < 100){
        	data[data.length] = latency;
        } else if (messageReceived == 100){
        	writeToFile();
        	console.log("WRITE TO FILE")
        }
        messageReceived++;

        // Write the data back to the socket, the client will receive it as data from the server
        //sock.write('You said "' + data + '"');
        
    });
    
    // Add a 'close' event handler to this instance of socket
    sock.on('close', function(data) {
        console.log('CLOSED: ' + sock.remoteAddress +' '+ sock.remotePort);
    });
    
}).listen(PORT, HOST);

console.log('Server listening on ' + HOST +':'+ PORT);