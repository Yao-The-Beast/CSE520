// {
//     "Credentials": {
//         "SecretAccessKey": "3dJbCXWB1a3xodpbk4i7UlMnAMXF8fOPAC4yYYAh", 
//         "SessionToken": "FQoDYXdzEHwaDOpJpMYRIso5fqEFwiKsAX/XlJEXcjt2tbn/yqjTxH4l8UPi+dPO0KmChJ9udLSHC2rbjbTLqs9QACqzED5DFI/zXZzxx1tAimtlmBAWMnI/zmWgIHgNj2R/28/S1HSa+qFPh6xlljGhx3gB2NfaRiyNxanIhHeDtnyvxRCDnSWbD6uVMwsISE9H6G4UO4+c9pTkl2Wud/WcZ9lLxKQ39J7PuQ91LVYbQ3YptgexvJA/SqaNOq1o6D6DtmIo6e/bvgU=", 
//         "Expiration": "2016-09-13T06:46:01Z", 
//         "AccessKeyId": "ASIAIZROIUPUAK4OPICA"
//     }
// }


var AWS = require('aws-sdk');
var http = require( 'http' );


AWS.config.update({
    "secretAccessKey": "3dJbCXWB1a3xodpbk4i7UlMnAMXF8fOPAC4yYYAh",
    "sessionToken": "FQoDYXdzEHwaDOpJpMYRIso5fqEFwiKsAX/XlJEXcjt2tbn/yqjTxH4l8UPi+dPO0KmChJ9udLSHC2rbjbTLqs9QACqzED5DFI/zXZzxx1tAimtlmBAWMnI/zmWgIHgNj2R/28/S1HSa+qFPh6xlljGhx3gB2NfaRiyNxanIhHeDtnyvxRCDnSWbD6uVMwsISE9H6G4UO4+c9pTkl2Wud/WcZ9lLxKQ39J7PuQ91LVYbQ3YptgexvJA/SqaNOq1o6D6DtmIo6e/bvgU=",
    "accessKeyId": "ASIAIZROIUPUAK4OPICA",
    "region": "us-west-2"
});

var sns = new AWS.SNS();

createHttpServer();


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

function handleIncomingMessage( msgType, msgData ) {
	if( msgType === 'SubscriptionConfirmation') {
		console.log("Confirm Subscription");
		sns.confirmSubscription({
			Token: msgData.Token,
			TopicArn: msgData.TopicArn
		}, onAwsResponse );

	} else if( msgType === 'Notification' ) {
    	console.log(msgData);

	} else {
		console.log( 'Unexpected message type ' + msgType );
	}
}

function createHttpServer() {
	var server = new http.Server();

	server.on( 'request', function( request, response ){

		console.log("MESSAGE")
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