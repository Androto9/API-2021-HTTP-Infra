var Chance = require('chance');
var Express = require('express');

var chance = new Chance();
var app = new Express();

function displayZoo(){
	var nbAnimals = chance.integer({min: 1, max: 10});
	var city = chance.city();

	console.log("Number of animals in " + city + " zoo : " + nbAnimals);

	var animals=[];
	for(var i = 0; i < nbAnimals; ++i){
		animals.push({ animal: chance.animal({ type: 'zoo' }) });
	}
	console.log(animals);
	return animals;
}

app.get('/zoo', function(req, res){ res.send("Welcome to the zoo");});

app.get('/zoo/animals' , function(req, res){ res.send(displayZoo());});

app.listen(3000, function(){ console.log('Accepting HTTP requets on port 3000.');});