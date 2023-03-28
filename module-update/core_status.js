/**
 * Loads status page and runs tests.  Launched by index.js
 * For notes on webdriver, see https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/.
 */

module.exports.test = function(options, webdriver, driver, baseUrl) {
  const path = '/admin/reports/status';

  // Load the page
  console.log("Opening status page at " + options.url + path);
  return driver.get(baseUrl + path)

    // Get the title and test that it matches our expectation.
    .then(() => driver.getTitle())
    .then((title) => {
      console.log("Opened " + title);
      if(!title.includes('Status report')) {
        return new Promise((resolve, reject) => reject('Error: Got wrong title for page at ' + options.url + path + '!'));
      }
    })
    .then(() => {
      if (options.core) {
        return test_core_version(options, webdriver, driver, baseUrl);
      }
    })
    .then(() => {
      if (options.php) {
        return test_php_version(options, webdriver, driver, baseUrl);
      }
    });
}

function test_core_version(options, webdriver, driver, baseUrl) {
  const By = webdriver.By;

  console.log(
    "\n\x1b[33m%s\x1b[0m",
    "Testing that the core version is " + options.core
  );
  return driver.executeScript('return document.querySelector(".system-status-general-info__item-icon--drupal+div h3").nextSibling.data')
    .then((version) => {
      version = version.replace("(","").trim();
      console.log("The core version is " + version);
      if (version !== options.core) {
        return new Promise((resolve, reject) => reject('Error: Got wrong core version!'));
      }
    });
}

function test_php_version(options, webdriver, driver, baseUrl) {

  const By = webdriver.By;

  console.log(
    "\n\x1b[33m%s\x1b[0m",
    "Testing that php version is " + options.php
  );
  return driver.executeScript('return document.querySelector(".system-status-general-info__item-icon--php+div h4").nextSibling.data')
    .then((version) => {
      version = version.replace("(","").trim();
      console.log("The PHP version is " + version);
      if (version !== options.php) {
        return new Promise((resolve, reject) => reject('Error: Got wrong PHP version!'));
      }
    });

}