(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var User = require("includes/models/user");

var user = new User();
user.setDob(new Date());

console.log("User lookup admin tool");

},{"includes/models/user":2}],2:[function(require,module,exports){
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

module.exports = User;
},{}]},{},[1])

