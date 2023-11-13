/**
 * Logs out of Drupal.
 */

module.exports.test = function(options, webdriver, driver, baseUrl) {

  const By = webdriver.By,
        config = require(process.env.PWD + '/browser-tests/config.js'),
        test_utils = require('../test-utils.js');

  var path = "/user/logout"

  if (config.logoutOptions) {
    path = config.logoutOptions.logoutPath || path;
  }

  // Load the page
  console.log(
    "\n\x1b[33m%s\x1b[0m",
    "Logging out of Drupal at " + options.url + path
  );
  return driver.get(baseUrl + path)

      // Get the title and test that it matches our expectation.
    .then(() => driver.getTitle())
    .then(title => {
      console.log("Opened " + title);
    })

    .then(() => console.log("Logged out."));

}
