var YEAR_SECONDS = 31556908.8;

// Pulled from http://stackoverflow.com/questions/4060004/calculate-age-in-javascript for example's sake
function calculateAge(birthday) { // birthday is a date
    var ageDifMs = Date.now() - birthday.getTime();
    var ageDate = new Date(ageDifMs); // miliseconds from epoch
    
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function User() {
	this.name = "Guest";
	this.dob = null;
	this.age = null;
}

User.prototype.setDob = function(dob) {
	this.dob = dob;
	this.age = calculateAge(dob);
};

User.prototype.isAdult = function() {
	return this.age >= 18;
};

modules.exports = User;