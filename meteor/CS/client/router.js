import './index.html';
import '../imports/Database/database.js';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { SensorData } from '../imports/Database/database.js';

Meteor.startup(function () {
  if (Meteor.isClient) {
    var location = Iron.Location.get();
    if (location.queryObject.platformOverride) {
      Session.set('platformOverride', location.queryObject.platformOverride);
    }
  }
});

Template.index.events({
  'click #navButton': function(e){
    e.preventDefault();
    Router.go('/sensorDataList');
  }
});


if(Meteor.isClient) {

  //subscribe
  Meteor.subscribe('sensorData');

  Router.configure({
    layoutTemplate: 'ApplicationLayout'
  });

  //index page
  Router.route('/', {
      template: 'index',
      data: function() {
        var allSensorNames = distinct(SensorData, "name");
        output = {allSensorNames: allSensorNames}
        return output;
      },
  });

  //sensor page
  Router.route('/sensor/:sensorNamef', {
      template: 'sensorDataList',
      data:function() {
        output = {sensorData: SensorData.find({}, {sort:{'timestamp':-1}}) };
        return output;
      },
  });
}

function distinct(collection, field) {
  return _.uniq(collection.find({}, {
    sort: {[field]: 1}, fields: {[field]: 1}
  }).map(x => x[field]), true);
}

