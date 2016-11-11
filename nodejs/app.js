var AWS = require('aws-sdk');
var fs = require('fs');
parseAWSConfig();
var http = require( 'http' );
var moment = require( 'moment');
var sns = new AWS.SNS();
var nodemailer = require('nodemailer');

//aws iot
var awsIot = require('aws-iot-device-sdk');
var device = awsIot.device({
  keyPath: "certs/6b76266105-private.pem.key",
  certPath: "certs/6b76266105-certificate.pem.crt",
  caPath: "certs/root-CA.crt",
  clientId: "haha",
  region: "us-west-2",
  baseReconnectTimeMs: 4000,
  keepalive: 30,
  protocol: "mqtts",
  port: 8883,
  host: "a3aynbt20dwoic.iot.us-west-2.amazonaws.com",
  debug: false
});

//test latency purpose
var messageReceived = 0;
var data = [];


handleIoTDevice();
createHttpServer();


function handleIoTDevice(){
	device
      .on('connect', function() {
         console.log('connect');
      });
   device
      .on('close', function() {
         console.log('close');
      });
   device
      .on('reconnect', function() {
         console.log('reconnect');
      });
   device
      .on('offline', function() {
         console.log('offline');
      });
   device
      .on('error', function(error) {
         console.log('error', error);
      });
   device
      .on('message', function(topic, payload) {
          console.log('message', topic, payload.toString());
		//   var currentDate = moment().format('x');
    	//   var latency = parseInt(currentDate) - parseInt(payload.toString());
    	//   console.log("Latency: " + latency + "ms");
      });
  }


function parseAWSConfig(){
	var configuration = JSON.parse(fs.readFileSync('credential.json', 'utf8'));
	var data = configuration.Credentials;
	data.region = "us-west-2";
	AWS.config.update({
		"region": data.region,
		"secretAccessKey": data.SecretAccessKey,
		"sessionToken": data.SessionToken,
		"accessKeyId": data.AccessKeyId
	});
}

function onAwsResponse( error, data ) {
	console.log( error || data );
}

function subscribeToSnS() {
	var params = {
	  Protocol: 'http', /* required */
	  TopicArn: 'arn:aws:sns:us-west-2:728331062905:HttpTest', /* required */
	  Endpoint: 'http://ec2-52-36-56-232.us-west-2.compute.amazonaws.com'
	};
	sns.subscribe(params, onAwsResponse );	
}

function writeToFile() {
	fs.writeFile(
    	'latency_result',
	    JSON.stringify(data),
	    function (err) {
	        if (err) {
	            console.error('Crap happens');
	        }
	    }
	);
}

function parseJSON( input ) {
	try{
		return JSON.parse( input );
	} catch( e ) {
		return input;
	}
}

function sendEmail(text) {
    // Not the movie transporter!
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'alicelovedrpepper@gmail.com', // Your email id
            pass: 'Rootbeer0816!' // Your password
        }
    });

    //var text = currentDate + '\n\n';

    var mailOptions = {
        from: 'alicelovedrpepper@gmail.com', // sender address
        to: 'drtailor1995@gmail.com', // list of receivers
        subject: 'IoT Email Alert', // Subject line
        text: text //, // plaintext body
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log(error);
        }else{
            console.log('Message sent: ' + info.response);
        };
    });
}

function mongodbHandler(msgContent){
	var MongoClient = require('mongodb').MongoClient;
	// Connect to the db
	MongoClient.connect("mongodb://localhost:27017/meteor", function(err, db) {
		if(err) { 
			return console.dir(err); 
		}
		var dataCollection = db.collection('sensorData');
		var entry = [
			{
				'type':'temperature',
				'data':msgContent,
				'timestamp': (new Date()),
			},
		];

		dataCollection.insert(entry, {w:1}, function(err, result){
			if (err) {
				return console.dir(err);
			}
		});
		//console.log("DEBUG: " + JSON.stringify(entry));
	});
}

function dummyMongodbHandler(msgContent){
	var MongoClient = require('mongodb').MongoClient;
	// Connect to the db
	MongoClient.connect("mongodb://localhost:27017/meteor", function(err, db) {
		if(err) { 
			return console.dir(err); 
		}
		var dataCollection = db.collection('sensorData');
		var entry = [
			{
				'type':'temperature',
                'name':'sensor1',
				'data':msgContent,
				'timestamp': (new Date()),
			},
		];

		dataCollection.insert(entry, {w:1}, function(err, result){
			if (err) {
				return console.dir(err);
			}
		});
		console.log("DEBUG: " + JSON.stringify(entry));
	});
}

function dummyMessageInserter(){
    var data = Math.floor(Math.random()*100);
    dummyMongodbHandler(data);
}


function handleIncomingMessage( msgType, msgData ) {
	if( msgType === 'SubscriptionConfirmation') {
		console.log("Confirm Subscription");
		sns.confirmSubscription({
			Token: msgData.Token,
			TopicArn: msgData.TopicArn
		}, onAwsResponse );

	} else if( msgType === 'Notification' ) {
		console.log("GET Notification");
    	dummyMessageInserter();
	} else {
		console.log( msgData);
		//publish the message if ncessary
		//the msg should be a led light command
		device.publish('ledData', JSON.stringify({
         ledLight: "on"
      	}));
      	//we may also want to send an email to notify the user that something is going on.
      	//var text = "IoT Email Alert! \n\n";
      	//sendEmail(text);
	}
}

function createHttpServer() {
	var server = new http.Server();

	server.on( 'request', function( request, response ){
		var msgBody = '';
		request.setEncoding( 'utf8' );

		request.on( 'data', function( data ){ 
			msgBody += data;
		});
		request.on( 'end', function(){
			var msgData = parseJSON( msgBody );
			var msgType = request.headers[ 'x-amz-sns-message-type' ];
			handleIncomingMessage( msgType, msgData );
		});
		response.end( 'OK' );
	});
	server.listen( 6001, subscribeToSnS );
}



    	// var currentDate = moment().format('x');
    	// var latency = parseInt(currentDate) - parseInt(msgData.Message);
    	// console.log("Latency: " + latency + "ms");
    	//write to file
    	//latency purprose
    	// if (messageReceived == 100) {
    	// 	writeToFile();
    	// 	console.log("LATENCY DATA WROTE TO FILE");
    	// }else if (messageReceived < 100) {
    	// 	data[data.length] = latency;
    	// }
    	// messageReceived++;