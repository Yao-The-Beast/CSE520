var net = require('net');
var moment = require('moment');

var client = new net.Socket();
client.connect(1337, '52.36.56.232', function() {
	var currentTimestamp = moment().format('x');
	client.write(parseInt(currentTimestamp));
});

client.on('data', function(data) {
	console.log('Received: ' + data);
	client.destroy(); // kill client after server's response
});

client.on('close', function() {
	console.log('Connection closed');
});