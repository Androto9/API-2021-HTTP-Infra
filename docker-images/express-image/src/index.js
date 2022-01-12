var Chance = require('chance');

var chance = new Chance();

var nbAnimals = chance.integer({min: 1, max: 10});
var city = chance.city();

console.log("Number of animals in " + city + " zoo : " + nbAnimals);

for(var i = 0; i < nbAnimals; ++i){
	console.log(chance.animal({type: 'zoo'}));
}