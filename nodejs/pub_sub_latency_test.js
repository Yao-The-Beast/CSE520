var AWS = require('aws-sdk');
var fs = require('fs');
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

var text = moment().format('x');
setInterval(function(){
    device.publish('latencyTest', text.toString());
    text = moment().format('x');
},100);
