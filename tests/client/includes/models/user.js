var test = require("tape");
var User = require("includes/models/user");

test("isAdult", function(t) {
	var user = new User();
	
	user.setDob(new Date());
	t.notOk(user.isAdult(), "User born today should not be an adult");
	
	user.setDob(new Date("1950-08-11"));
	t.ok(user.isAdult(), "User born in the '50s should be an adult");
	
	t.end();
});