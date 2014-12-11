Getting started with Gulp and Browserify
========================================

This repository is an example of how to structure a project that requires multiple browserify bundles for multiple applications (e.g.: multiple pages with different functionality in a medium to large size website).

For an in-depth description of how the project is setup and how the gulp build jobs work, see my blog entry, [Getting Started with Gulp and Browserify](http://justinjohnson.org/javascript/getting-started-with-gulp-and-browserify/).

# Feature Overview

## Gulp Tasks

This project provides the following gulp tasks

* `lint` – JSHint static analysis
* `build-common-lib` – Concatenates several common/global modules (e.g.: jQuery and Bootstrap) into one cacheable and minified script.  Which libraries are included is configurable.
* `build` – Browserifies every individual file in /applications/client/apps.  Creates both deflated and minified versions of each bundled application with source maps.
* `autobuild` – Watches all applications in /applications/client and their dependencies, and rebuilds only the affected apps whenever a change is detected.
* `test` – Runs all unit tests found in /tests/client.  Assumes TAP output.
* `autotest` – Watches everything in /applications/client and /tests/client, and auromatically runs all units tests when a change is detected.
* `auto` – Alias for `gulp autotest autobuild`
* `housekeeping` – Installs client-side Git hooks and periodically ensures that all npm modules are installed and updated.  This task is a depdency of almost all other tasks to ensure that it's ran.
* `default` – Runs `lint`, `test`, `build-common-lib`, and `build` asynchronously.
* `serial` – The same as `default`, but all tasks are run synchronously. This is useful if you have lots of exceptions in the build process or during tests.

## Git Hooks

* `pre-commit` – Makes sure that automatically built application bundles are not checked in.  Bundles must be built normally (with `gulp` or `gulp build`).  Bundles built automatically with Watching necessarily contain full absolute path information that shouldn't be committed.

# Installing

Simply clone this repository and then run 

    npm install
    
Once the install is complete, you can run the full gulp build with

    gulp
    
