
messageInserter();

function mongodbHandler(msgContent){
	var MongoClient = require('mongodb').MongoClient;
	// Connect to the db
	MongoClient.connect("mongodb://localhost:27017/meteor", function(err, db) {
		if(err) { 
			return console.dir(err); 
		}
		var dataCollection = db.collection('sensorData');
		var entry = [
			{
				'type':'temperature',
                'name':'sensor1',
				'data':msgContent,
				'timestamp': (new Date()),
			},
		];

		dataCollection.insert(entry, {w:1}, function(err, result){
			if (err) {
				return console.dir(err);
			}
		});
		console.log("DEBUG: " + JSON.stringify(entry));
	});
}

function messageInserter(){
    setInterval(function(){
        var data = Math.floor(Math.random()*100);
        mongodbHandler(data);
    }, 6000)
}
