/*
 * Gentlemen ... behold! Dependencies! 
 */
try {
	var _ = require("lodash");
	var buffer = require("vinyl-buffer");
	var browserify = require("browserify");
	var concat = require("gulp-concat");
	var file = require("read-file");
	var forEach = require("gulp-foreach");
	var gulp = require("gulp");
	var jshint = require("gulp-jshint");
	var log = require("npmlog");
	var rename = require("gulp-rename");
	var runSequence = require("run-sequence");
	var shell = require("shelljs");
	var size = require("gulp-size");
	var source = require("vinyl-source-stream");
	var sourcemaps = require("gulp-sourcemaps");
	var uglify = require("gulp-uglify");
	var util = require("gulp-util");
	var watchify = require("watchify");
} catch (e) {
	// Unknown error, rethrow it.	
	if (e.code !== "MODULE_NOT_FOUND") {
		throw e;
	}
	
	// Otherwise, we have a missing dependency. If the module is in the dependency list, the user just needs to run `npm install`.  
	// Otherwise, they need to install and save it.  
	var dependencies = require("./package.json").devDependencies;
	var module = e.toString().match(/'(.*?)'/)[1];
	var command = "npm install";
	
	if (typeof dependencies[module] === "undefined") {
		command += " --save-dev " + module;
	}
	
	console.error(e.toString() + ". Fix this by executing:\n\n" + command + "\n");
	process.exit(1);
}


/*
 * Configuration
 */
const JS_BASE_DIR = "./applications/client/";
const APPS_GLOB = JS_BASE_DIR + "apps/**/*.js";
const APPS_DIST_DIR = "./public_html/javascript/apps/";
const TESTS_GLOB = "./tests/client/**/*.js";

const EXTERNAL_LIBS = {
	jquery: "./node_modules/jquery/dist/jquery.min.js",
	bootstrap: "./node_modules/bootstrap/dist/js/bootstrap.min.js"
};
const BROWSERIFY_TRANSFORMS = ["brfs"];

const LAST_DEPENDENCY_UPDATE_ID_FILE = ".npmDependenciesLastCommitId";
const AUTOBUILD_FLAG_FILE = ".autobuild";

const SIZE_OPTS = {
	showFiles: true,
	gzip: true
};
const LINT_OPTS = {
	unused: true,
	eqnull: true,
	jquery: true
};

// Always add JS_BASE_DIR to the NODE_PATH environment variable.  This allows us to include our own modules
// with simple paths (no crazy ../../../../relative/paths) without having to resort to a symlink in node_modules 
// or other transforms that would add time to our build.  For example, from application/client/apps/login/index.js, 
// we can do `require("properties")` instead of `require("../../../properties")`
process.env.NODE_PATH = JS_BASE_DIR + ":" + (process.env.NODE_PATH || "");

// Pretty, pretty log messages.
log.enableColor();


/*
 * Helper functions
 */


/**
 * Get a properly configured bundler for manual (browserify) and automatic (watchify) builds.
 * 
 * @param {object} file The file to bundle (a Vinyl file object).
 * @param {object|null} options Options passed to browserify.
 */
function getBundler(file, options) {
	options = _.extend(options || {}, {
		// Enable source maps.
		debug: true,
		// Configure transforms.
		transform: BROWSERIFY_TRANSFORMS
	});
	
	// Initialize browserify with the file and options provided.
	var bundler = browserify(file.path, options);
	
	// Exclude externalized libs (those from build-common-lib).
	Object.keys(EXTERNAL_LIBS).forEach(function(lib) {
		bundler.external(lib);
	});

	return bundler;
}


/**
 * Build a single application with browserify creating two differnt versions: one normal and one minified.
 * 
 * @param {object} file The file to bundle (a Vinyl file object).
 * @param {browserify|watchify} bundler  The bundler to use.  The "build" task will use browserify, the "autobuild" task will use watchify.
 */
function bundle(file, bundler) {
	// Remove file.base from file.path to create a relative path.  For example, if file looks like
	//   file.base === "/Users/johnsonj/dev/web/super-project/applications/client/apps/"
	//   file.path === "/Users/johnsonj/dev/web/super-project/applications/client/apps/login/reset-password/confirm.js"
	// then result is "login/reset-password/confirm.js"
	var relativeFilename = file.path.replace(file.base, "");
	
	return bundler
		// Log browserify errors
		.on("error", util.log.bind(util, "Browserify Error"))
		// Bundle the application
		.bundle()
		// Rename the bundled file to relativeFilename 
		.pipe(source(relativeFilename))
		// Convert stream to a buffer
		.pipe(buffer())
		// Save the source map for later
		.pipe(sourcemaps.init({loadMaps: true}))
		// Save normal source (useful for debugging)
		.pipe(gulp.dest(APPS_DIST_DIR))
		// Minify source for production
		.pipe(uglify())
		// Save source maps (since minification will remove them)
		.pipe(sourcemaps.write())
		// Add the .min suffix before the extension
		.pipe(rename({suffix: ".min"}))
		// Debuging output
		.pipe(size(SIZE_OPTS))
		// Write the minified file.
		.pipe(gulp.dest(APPS_DIST_DIR));
}


/*
 * Gulp tasks 
 */


/**
 * Ensure that our project is always setup correctly.  So far this includes two things:
 *  1. Make sure git hooks are installed
 *  2. Make sure npm dependencies are current
 * 
 * #2 is achieved by keeping track of the last commit ID in which we updated dependencies.  If 
 * the current state of the repo does not have that commit ID, then we will update dependencies
 * and the ID in that file.  It's a clumsy approach, but it works for now.
 */
gulp.task("housekeeping", function() {
	// Get the current repo ID.
	var currentId = shell.exec("git rev-parse HEAD", {silent: true}).output;
	// The last commit ID that we automatically updated on
	var lastId = null;
	
	// Ensure that the git client-side hooks are installed.
	gulp.src("assets/git/hooks/*")
		.pipe(forEach(function(stream, file) {
			// The link source must be relative to .git/hooks
			var src = "../../" + file.path.replace(process.cwd() + "/", ""), 
				dest = ".git/hooks/" + file.path.replace(file.base, "");
				
			// Make sure the hook is executable.
			shell.chmod("ug+x", file.path);
	
			// Don't use `shell.ln("-sf", src, dest);`  This will create the symlink with an absolute path which will
			// break if you ever move this repo.
			shell.exec("ln -sf " + src + " " + dest);
		}));
	
	// Get the last repo ID at which we updated the npm dependencies.
	try {
		lastId = file.readFileSync(LAST_DEPENDENCY_UPDATE_ID_FILE);
	} catch (e) { }
	
	// IDs match, nothing to do.	
	if (lastId != null && lastId == currentId) {
		log.info("housekeeping", "npm dependencies are current since the last commit");
		return;
	}
	
	// IDs do not match, make sure everything is installed and up to date
	log.info("housekeeping", "Executing `npm install`");
	shell.exec("npm install");
	
	log.info("housekeeping", "Executing `npm-check-updates -u`");
	shell.exec("npm-check-updates -u");
	
	// Update our ID tracking file.
	shell.exec("git rev-parse HEAD > " + LAST_DEPENDENCY_UPDATE_ID_FILE, {async: true, silent: true});
});


/**
 * Externalize all site-wide libraries into one file.  Since these libraries are all sizable, it would be better for the
 * client to request it individually once and then retreive it from the cache than to include all of these files into
 * each and every browserified application. 
 */
gulp.task("build-common-lib", ["housekeeping"], function() {
	var paths = [];
	
	_.forEach(EXTERNAL_LIBS, function(path) {
		paths.push(path);
	});
	
	return gulp.src(paths)
		// Output each file that will be concatenated into the common.js file
		.pipe(size(SIZE_OPTS))
		// Concatenate all files
		.pipe(concat("common.min.js"))
		// Minify the result
		.pipe(uglify())
		// Output the new file size
		.pipe(size(SIZE_OPTS))
		// Save that file to the appropriate location
		.pipe(gulp.dest(APPS_DIST_DIR + "../lib/"));
});


/**
 * Browserify and minify each individual application found with APPS_GLOB.  Each file therein represents a separate
 * application and should have its own resultant bundle.  
 */
gulp.task("build", ["housekeeping"], function() {
	var stream = gulp.src(APPS_GLOB)
		.pipe(forEach(function(stream, file) {
			bundle(file, getBundler(file));
		}));
		
	// A normal build has completed, remove the flag file.
	shell.rm("-f", AUTOBUILD_FLAG_FILE);
	
	return stream;
});


/**
 * Watch applications and their dependencies for changes and automatically rebuild them.  This will keep build time small since
 * we don't have to manually rebuild all applications everytime we make even the smallest/most isolated of changes. 
 */
gulp.task("autobuild", ["housekeeping"], function() {
	return gulp.src(APPS_GLOB)
		.pipe(forEach(function(stream, file) {
			// Get our bundler just like in the "build" task, but wrap it with watchify and use the watchify default args (options).
			var bundler = watchify(getBundler(file, watchify.args));
			
			function rebundle() {
				// When an automatic build happens, create a flag file so that we can prevent committing these bundles because of
				// the full paths that they have to include.  A Git pre-commit hook will look for and block commits if this file exists.
				// A manual build is require before bundled assets can be committed as it will remove this flag file.
				shell.exec("touch " + AUTOBUILD_FLAG_FILE);
				
				return bundle(file, bundler);
			}
			
			bundler.on("update", rebundle);
			
			return rebundle();
		}));
});


/**
 * Linter for the most basic of quality assurance.
 */
gulp.task("lint", function() {
	return gulp.src(JS_BASE_DIR + "**/*.js")
		.pipe(jshint(LINT_OPTS))
		.pipe(jshint.reporter("default"));
});


/**
 * Run tests with tape and cleanup the output with faucet.
 */
gulp.task("test", function() {
	shell.exec("tape " + TESTS_GLOB + " | faucet");
});


/**
 * Automatically run tests anytime anything is changed (tests or test subjects).
 */
gulp.task("autotest", function() {
	gulp.watch(
		[JS_BASE_DIR + "**/*.js", TESTS_GLOB], 
		["test"]
	);
});


/**
 * Run all automatic jobs.
 */
gulp.task("auto", ["autobuild", "autotest"]);


/**
 * The same as the default task, but done serially so that the output doesn't get all jumbled. 
 */
gulp.task("serial", function() {
	runSequence(
		"housekeeping",
		"build-common-lib",
		"lint", 
		"build",
		"test"
	);
});


/**
 * Run all jobs in parallel except for "test," which should always come last because errors therein can really mess up the build output.
 */
gulp.task("default", ["lint", "test", "build-common-lib", "build"]);
