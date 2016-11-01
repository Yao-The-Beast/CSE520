var awsIot = require('aws-iot-device-sdk');

processTest();

function processTest() {
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

   var count = 0;

   //device.subscribe('topic_1');

   timeout = setInterval(function() {
      count++;
      console.log("publish topic: ledLight");
      device.publish('ledLight', JSON.stringify({
         mode2Process: count
      }));
   }, 1000); // clip to minimum

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
      });

}

