import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import './sensorDataEntry.html';

Template.body.helpers({
	thisSensorDataDisplay: function() {
		return; 
	}
});


Template.body.events({
  'click .toggle-checked'() {
    // Set the checked property to the opposite of its current value
    Meteor.call('tasks.setChecked', this._id, !this.checked);
  },
});
