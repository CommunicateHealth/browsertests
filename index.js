/**
 * Runs basic navigation tests using chromedriver.
 * For notes on webdriver, see https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/.
 */

const { test } = require('./module-update/login.js');

const webdriver = require('selenium-webdriver'),
  test_utils = require('./test-utils.js'),
  config = require('../browser-tests/config.js'),
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

console.log('Testing site: ' + options.url)

// Set the window size
driver.manage().window().setRect({height:768,width:1024})

  // Run the tests on each page
  .then(() => {
    return tests.reduce((promise, test) => {
      return promise
        .then(() => {
          console.log("Testing " + test.name);
          return test.test
            .test(options, webdriver, driver, baseUrl)
            .then(() => console.log("Tested " + test.name));
        })
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
      console.log("Quitting");
      return driver.quit().then(console.log("Quit complete."));
    }
  })

/**
 * Returns tests, looking in this directory and in ../browser-tests
 *
 * @param {*} options
 * @returns
 */
function resolveTests(options) {
  const fs = require('fs'),
    excludeNames = [
      "index.js",
      "test-utils.js",
      "config.js"
    ],
    dirs = [__dirname, __dirname + "/../browser-tests/"],
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
      if (fileName.endsWith(".js")) {
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
        if (test.testSpec && test.testSpec.require) {
          if (!checkOptionsIncluded(testSpec.require, options, true)) {
            return;
          }
        }
        if (test.testSpec && test.testSpec.exclude) {
          if (checkOptionsIncluded(testSpec.exclude, options, false)) {
            return;
          }
        }
        tests.push ({name: filenameBase, test: test});
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
