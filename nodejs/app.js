var AWS = require('aws-sdk');
var http = require( 'http' );


AWS.config.update({
    "secretAccessKey": "yZEk9VZeh4YHliLEkJqCuXdxiuQm4xipmfD3JPG2",
    "sessionToken": "FQoDYXdzEID//////////wEaDBHHlFvkSH8kdjuCeSKsAW3vVcOjJsZNupxhb1e7oxq5LCQol08q2A17SxW48v1+Kjt845PY+P8pxeBdv/eAiJhtaGgmV+F+IbS4bPeXFKh2nKS5OvFrDPHhtnZxSuwrn9XRcr5nmdDN0U0DHjuAj7Jn4YKkCEnIx8FReNxp3tRXAvtmW2zEz53vNvMu+NQgql2lc8T+TklsLpnHqmHLI7HuTO3lTbBtrv9sY4yQh/9WxRsu5q0RTUFeSIAonL6RvwU=",
    "accessKeyId": "ASIAIAIE3PX6NHHZRZYQ",
    "region": "us-west-2"
});

var sns = new AWS.SNS();

parseAWSConfig();
createHttpServer();


function parseAWSConfig(){
	var configuration = require('./credential.json');
	var data = configuration.Credentials;
	// AWS.config.update({
	// 	"secretAccessKey": data.SecretAccessKey,
	// 	"sessionToken": data.SessionToken,
	// 	"accessKeyId": data.AccessKeyId,
	// 	"region": "us-west-2",
	// });
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

function parseJSON( input ) {
	try{
		return JSON.parse( input );
	} catch( e ) {
		return input;
	}
}

function mongodbHandler(msgContent){
	var MongoClient = require('mongodb').MongoClient;
	// Connect to the db
	MongoClient.connect("mongodb://localhost:27017/test", function(err, db) {
		if(err) { 
			return console.dir(err); 
		}
		var dataCollection = db.collection('data');
		var entry = [
			{'type':'temperature',
			'data':msgContent},
		];

		dataCollection.insert(entry, {w:1}, function(err, result){
			if (err) {
				return console.dir(err);
			}
		});
		//console.log("DEBUG:" + msgContent);
	});
}

function storeMsg(data){
	msg = data.Message;
	mongodbHandler(msg);
}

function handleIncomingMessage( msgType, msgData ) {
	if( msgType === 'SubscriptionConfirmation') {
		console.log("Confirm Subscription");
		sns.confirmSubscription({
			Token: msgData.Token,
			TopicArn: msgData.TopicArn
		}, onAwsResponse );

	} else if( msgType === 'Notification' ) {
    	storeMsg(msgData);
	} else {
		console.log( 'Unexpected message type ' + msgType );
	}
}


function createHttpServer() {
	var server = new http.Server();

	server.on( 'request', function( request, response ){

		//console.log("MESSAGE")
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