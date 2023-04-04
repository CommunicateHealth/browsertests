/**
 * Runs basic navigation tests using chromedriver.
 * For notes on webdriver, see https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/.
 */

const webdriver = require('selenium-webdriver'),
  test_utils = require('./test-utils.js'),
  config = require(process.env.PWD + '/browser-tests/config.js'),
  options = test_utils.process_options(process.argv, config),
  baseUrl = options.baseUrl,
  logging = webdriver.logging,
  loggingPrefs = new webdriver.logging.Preferences().setLevel(logging.Type.BROWSER, logging.Level.WARNING),
  chrome = require('selenium-webdriver/chrome')
  chromeOptionsArgs = options.debug ? [] : ['--headless','--no-sandbox', '--disable-dev-shm-usage'],
  chromeOptions = new chrome.Options().addArguments(chromeOptionsArgs).setLoggingPrefs(loggingPrefs),
  driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build(),
  tests = resolveTests(options);

if (options.help) {
  showHelp(tests, options);
  return;
}

console.log("\x1b[32m%s\x1b[0m", 'Testing site: ' + options.url)
console.log();

// Set the window size
driver.manage().window().setRect({height:768,width:1024})

  // Run the tests on each page
  .then(() => {
    return tests.reduce((promise, test) => {
      return promise
        .then(() => console.log("\x1b[32m%s\x1b[0m", "Testing " + test.name))
        // Set the window size
        .then(() => driver.manage().window().setRect({height:768,width:1280}))
        // Run the test
        .then(() => test.obj.test(options, webdriver, driver, baseUrl));
    }, Promise.resolve());
  })

  // Indicate successful run.
  .then(() => console.log("\n\x1b[32m%s\x1b[0m", "Done tests"))

  // If return new Promise((_,reject).reject(...)) encountered, jump to here.
  .catch((err) => {
    console.error("\n\x1b[31m\x1b[7m%s\x1b[0m", "Caught error:", err);
    process.exitCode = 1;
  })

  // Always run this clean-up code.
  .finally(() => {
    if (!options.debug || options.debug < "2") {
      console.log("\n\x1b[7m%s\x1b[0m", "Quitting");
      return driver.quit().then(console.log("Quit complete."));
    }
  })

/**
 * Returns tests, looking in this directory and in [PWD]/browser-tests
 */
function resolveTests(options) {
  const fs = require('fs'),
    excludeNames = [
      "index.js",
      "test-utils.js",
      "config.js"
    ],
    dirs = [__dirname, process.env.PWD + "/browser-tests"],
    allowedTests = options.tests ? (options.tests).split(',') : [];
  var tests = [];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      return;
    }
    files = fs.readdirSync(dir);
    files.forEach((fileName) => {
      var filenameBase,
        test;
      if (excludeNames.includes(fileName)) {
        return;
      }
      if (fileName.endsWith(".js") || fs.lstatSync(dir + "/" + fileName).isDirectory()) {
        filenameBase = fileName.split(".")[0];
        if (
          allowedTests.length > 0 &&
          !allowedTests.includes(filenameBase)
        ) {
          return;
        }
        if (fs.existsSync(dir + "/" + filenameBase + ".js")) {
          test = require(dir + "/" + filenameBase + ".js");
        } else if (fs.existsSync(__dirname + "/" + filenameBase + "/index.js")) {
          test = require(dir + "/" + filenameBase + "/index.js");
        } else {
          return;
        }
        if (!options.help && (test.testSpec && test.testSpec.require)) {
          if (!checkOptionsIncluded(test.testSpec.require, options, true)) {
            return;
          }
        }
        if (!options.help && (test.testSpec && test.testSpec.exclude)) {
          if (checkOptionsIncluded(test.testSpec.exclude, options, false)) {
            return;
          }
        }
        tests.push ({name: filenameBase, obj: test});
      }
    });
  });
  tests.sort((a,b) => {
    if (a.name === "front-page" ) {
      return -1;
    }
    if (b.name === "front-page" ) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });
  return tests;
}

function checkOptionsIncluded(testSet, options, all) {
  if (typeof testSet === "string") {
    return options[testSet];
  }
  if (Array.isArray(testSet)) {
    if (all) {
      return testSet.every((testItem) => checkOptionsIncluded(testItem, options, all))
    } else {
      return testSet.some((testItem) => checkOptionsIncluded(testItem, options, all))
    }
  }
  return Object.keys(testSet).some(testKey => {
    var testObj = testSet[testKey];
    if (typeof testObj === "string") {
      return options[testKey] === testObj;
    }
    if (Array.isArray(testObj)) {
      retVal = testObj.some(testItem => testItem === options[testKey])
      return retVal;
    }
  });
}

function showHelp(tests, options) {
  console.log("Usage: npm browsertests [parameter] [options]");
  console.log("Parameter: [sitename or url] (optional, defaults to docksal site)");
  console.log("Option: --url=[url] specifes base url.");
  console.log("Option: --tests=test1[,test2][,test3] comma separated list of tests to perform (including front-page), defaults to all tests.");
  console.log("Option: --debug=[1|2] 1 displays progress of tests in a browser window, 2 keeps window open at end.");
  console.log("Option: --user=[basic or form login username]")
  console.log("Option: --pass=[basic or form login password]")
  console.log("Option: --loginUser=[Drupal login username]")
  console.log("Option: --loginPass=[Drupal login password]")
  console.log("Option: --strict if set, capture console errors")
  console.log("Other options may be specified in tests:");
  tests.forEach((test) => {
    console.log('- ' + test.name);
    if (test.obj.help instanceof Function) {
      test.obj.help(options);
    } else if (test.obj.help instanceof Array) {
      test.obj.help.forEach((help) => console.log('  ' + (help.startsWith('-') ? '' : '- ') + help));
    } else if (test.obj.help) {
      console.log('  ' + (test.objhelp.startsWith('-') ? '' : '- ') + test.obj.help);
    }
  });
  console.log;
}
