import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { SensorData } from '../Database/database.js';
import './sensorDataEntry.js';
import './body.html';


Template.body.onCreated(function bodyOnCreated() {
  this.state = new ReactiveDict();
  Meteor.subscribe('sensorData');
});

Template.body.helpers({
	sensorData() {
		var output = SensorData.find({},{sort:{'timestamp':-1}});
		return output;
	},
});