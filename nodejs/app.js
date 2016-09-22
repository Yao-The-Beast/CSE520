var AWS = require('aws-sdk');
var http = require( 'http' );

var sns = new AWS.SNS();

parseAWSConfig();
createHttpServer();


function parseAWSConfig(){
	var config = require('./credential.json');
	var data = config.Credentials;
	AWS.config.update({
		"secretAccessKey": data.SecretAccessKey,
		"sessionToken": data.SessionToken,
		"accessKeyId": data.AccessKeyId,
		"region": "us-west-2"
	})
	console.log(AWS.config);
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