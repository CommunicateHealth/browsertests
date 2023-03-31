/**
 * Runs front-page tests.  Launched by index.js
 * For notes on webdriver, see https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/.
 */

module.exports.test = function(options, webdriver, driver, baseUrl) {

  const By = webdriver.By,
        actions = driver.actions(),
        until = webdriver.until,
        config = require(process.env.PWD + '/browser-tests/config.js'),
        test_utils = require('../test-utils.js'),
        loginUser = options.loginUser,
        loginPass = options.loginPass,
        path = config.loginOptions.loginPath,
        loginPageName = config.loginOptions.loginPageName,
        loggedinPageName = config.loginOptions.loggedinPageName.replace('%loginUser%', loginUser),
        relPath = '/../../docroot/themes/custom/neimedia/images/homepage_circle_healthyVision.jpg',
        filepath = require('path').resolve(process.cwd() + relPath);

  if (!loginUser || !loginPass) {
    return new Promise((resolve, reject) => reject('Error: Need to specify --loginUser=[username] --loginPass=[password] for these tests!'));
  }

  // Load the page
  console.log("Opening login page at " + options.url + path);
  return driver.get(baseUrl + path)

      // Get the title and test that it matches our expectation.
    .then(() => driver.getTitle())
    .then(title => {
      console.log("Opened " + title);
      if(title !== loginPageName) {
        return new Promise((resolve, reject) => reject('Error: Got wrong title for page at ' + options.url + path + '!'));
      }
    })

    .then(() => console.log('Fill-out and submit log-in page'))
    .then(() => driver.findElement(By.id('edit-name')))
    .then((editName) => editName.sendKeys(loginUser))
    .then(() => driver.findElement(By.id('edit-pass')))
    .then((editPass) => editPass.sendKeys(loginPass))
    .then(() => driver.findElement(By.id('edit-submit')))
    .then((editSubmit) => test_utils.clickAndWaitForReload(webdriver, driver, editSubmit))
    .then(() => driver.getTitle())
    .then((title) => {
      console.log("Opened " + title);
      if(title !== loggedinPageName) {
        return new Promise((resolve, reject) => reject('Error: Got wrong title for page after logging in!'));
      }
    })

    .then(() => console.log("Logged in."));

}
