import '../imports/Database/database.js';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { SensorData } from '../imports/Database/database.js';

function distinct(collection, field) {
  return _.uniq(collection.find({}, {
    sort: {[field]: 1}, fields: {[field]: 1}
  }).map(x => x[field]), true);
}


//Meteor startup
Meteor.startup(function () {
  if (Meteor.isClient) {
    var location = Iron.Location.get();
    if (location.queryObject.platformOverride) {
      Session.set('platformOverride', location.queryObject.platformOverride);
    }
  }
});

//sensorDataList Helper
Template.sensorDataList.helpers({
  showTime(isoString) {
    if ( isoString ) {
      return moment(isoString).format( 'HH:mm:ss, MM/DD' );
    } 
  },
  sensorData() {
      var sensorName = Router.current().params.sensorName;
      var output = SensorData.find({'name':sensorName}, {sort:{'timestamp':-1}, limit:50});
      return output;
  },
});


if(Meteor.isClient) {

  //subscribe
  Meteor.subscribe('sensorData');

  Router.configure({
    layoutTemplate: 'ApplicationLayout',
    data: function() {
        var allSensorNames = distinct(SensorData, "name");
        output = {allSensorNames: allSensorNames}
        return output;
    }
  });

  //welcome page
  Router.route('/', {
    action: function(){
      this.render('welcome',{to:"data"});
    }
  });

  //sensor page
  Router.route('/sensor/:sensorName', {
    waitOn: function () {
        return Meteor.subscribe('sensorData');
    },
    action: function(){
      this.render('sensorDataList',{to:"data"});
      this.render('chart',{to:"graph"});
    },
  });
}






