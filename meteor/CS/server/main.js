import '../imports/Database/database.js';
import { HTTP } from 'meteor/http'

if (Meteor.isServer) {
  Meteor.startup(function () {
  	Meteor.methods({
  	  sendCommand: function(data) {
  		//make http post
  	    HTTP.call("POST", "http://127.0.0.1:6001", data, 
              function (error, result) {
                if (!error) {
                  console.log("HTTP SUCCESS");
                } else {
                  console.log(error);
                  console.log("HTTP FAIL");
                }
              }
      	);
  	  }
  	});
  });
}