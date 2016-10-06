import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export const SensorData = new Mongo.Collection("sensorData");

if (Meteor.isServer) {
	Meteor.publish('sensorData', function publishSensorData(){
		var output = SensorData.find();
		return output;
	});
}