/**
 * Manages module-update tests.  Launched by ../index.js
 * For notes on webdriver, see https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/.
 *
 * Use the options:
 *   --modules=mod_1,mod_2,mod_etc to test specific modules
 *   --core=#.#[].#] to test that the core version matches the specified version
 *   --php=#.#[.#] to test that the php version matches the specified version
 * Otherwise, all tests corresponding to enabled modules will be run.
 */

const { syncBuiltinESMExports } = require('module');

module.exports.testSpecs = {require: ["loginUser", "loginPass"]};

module.exports.test = function (options, webdriver, driver, baseUrl) {
  const By = webdriver.By,
    until = webdriver.until,
    test_utils = require('../test-utils.js'),
    login = require('./login.js'),
    modules = require('./modules.js'),
    dblog = require('./dblog.js');
  var tests;
  console.log(
    "\x1b[7m%s\x1b[0m",
    "Testing module updates"
  );
  return login.test(options, webdriver, driver, baseUrl)
    .then(() => dblog.test(options, webdriver, driver, baseUrl, true))
    .then(() => modules.test(options, webdriver, driver, baseUrl))
    .then((moduleList) => {
      options.moduleList = moduleList;
      tests = resolveTests(options)
      var promise = Promise.resolve();
      tests.forEach((test) => {
        promise = promise
          .then(() => test.test(options, webdriver, driver, baseUrl))
          .then(() => dblog.test(options, webdriver, driver, baseUrl));
      });
      return promise;
    });
}

function resolveTests(options) {
  const fs = require('fs');
  var files = fs.readdirSync(__dirname),
    allowedTests = options.moduleList,
    tests = [];
  if (options.core || options.php) {
    tests.push(require("./core_status.js"))
  }
  if (options.modules) {
    allowedTests = (options.modules).split(',');
  }
  files.sort();
  files.forEach((fileName) => {
    var filenameBase;
    if (fileName.startsWith("module_") && fileName.endsWith(".js")) {
      filenameBase = fileName.split(".")[0].substring(7);
      if (
        allowedTests.length == 0 ||
        allowedTests.some((allowedTest) => filenameBase === allowedTest)
      ) {
        tests.push(require("./" + fileName));
      }
    }
  });
  return tests;
}
