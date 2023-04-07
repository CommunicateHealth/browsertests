/**
 * Logs into Drupal.
 */

module.exports.test = function(options, webdriver, driver, baseUrl) {

  const By = webdriver.By,
        config = require(process.env.PWD + '/browser-tests/config.js'),
        test_utils = require('../test-utils.js'),
        loginUser = options.loginUser,
        loginPass = options.loginPass;

  var path = "/user/login",
      loginPageName = "Log in",
      loggedinPageName = '%loginUser%';

  if (!loginUser || !loginPass) {
    return new Promise((resolve, reject) => reject('Error: Need to specify --loginUser=[username] --loginPass=[password] for these tests!'));
  }

  if (config.loginOptions) {
    path = config.loginOptions.loginPath || path;
    loginPageName = config.loginOptions.loginPageName || loginPageName;
    loggedinPageName = config.loginOptions.loggedinPageName || loggedinPageName;
  }
  loggedinPageName = loggedinPageName.replace('%loginUser%', loginUser)

  // Load the page
  console.log("Opening login page at " + options.url + path);
  return driver.get(baseUrl + path)

      // Get the title and test that it matches our expectation.
    .then(() => driver.getTitle())
    .then(title => {
      console.log("Opened " + title);
      if(!title.includes(loginPageName)) {
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
      if(!title.includes(loggedinPageName)) {
        return new Promise((resolve, reject) => reject('Error: Got wrong title for page after logging in!'));
      }
    })

    .then(() => console.log("Logged in."));

}
