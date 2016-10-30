var net = require('net');
var moment = require('moment');

var client = new net.Socket();
client.connect(1337, '52.36.56.232', function() {
	var i =0;
	while (i < 100) {
		var currentTimestamp = moment().format('x');
		var data = currentTimestamp.toString();
		client.write(data);
		i++;
		var timestamp = moment().format('x');
		while (moment().format('x') - timestamp < 1000){

		}
	}
	console.log("END");
});

client.on('data', function(data) {
	console.log('Received: ' + data);
	client.destroy(); // kill client after server's response
});

client.on('close', function() {
	console.log('Connection closed');
});