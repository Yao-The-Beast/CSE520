import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export const SensorData = new Mongo.Collection("sensorData");

if (Meteor.isServer) {
	Meteor.publish('sensorData', function publishSensorData(){
		var output = SensorData.find();
		return output;
	});
}

Meteor.methods({
	'sensorData.setChecked'(sensorDataId, setChecked) {
		check(taskId, String);
    	check(setChecked, Boolean);

    	const task = SensorData.findOne(sensorDataId)

    	SensorData.update(sensorDataId, {$set: {checked: setChecked}})
	}
});