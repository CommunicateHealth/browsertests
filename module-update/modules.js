/**
 * Loads list of enabled modules.  Launched by index.js
 * For notes on webdriver, see https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/.
 */

module.exports.test = function(options, webdriver, driver, baseUrl) {

  const By = webdriver.By,
        actions = driver.actions(),
        until = webdriver.until,
        config = require('../config.js'),
        test_utils = require('../test-utils.js'),
        path = "/admin/modules"
        moduleList = [];

  // Load the page
  console.log("Opening modules page at " + options.url + path);
  return driver.get(baseUrl + path)

      // Get the title and test that it matches our expectation.
    .then(() => driver.getTitle())
    .then(title => {
      console.log("Opened " + title);
      if(!title.includes("Extend")) {
        return new Promise((resolve, reject) => reject('Error: Got wrong title for page at ' + options.url + path + '!'));
      }
    })

    .then(() => driver.findElements(By.css('input[data-drupal-selector^=edit-modules-][checked]')))
    .then((elements) => {
      return elements.reduce((promise, element) => {
        return promise
          .then(() => element.getAttribute('name'))
          .then((name) => {
            const re = /[^\]]+\[([^\]]+)/;
            var matches = name.match(re);
            if (matches && matches.length > 1) {
              moduleList.push(matches[1]);
            }
          })
      }, Promise.resolve());
    })
    
 
    .then(() => console.log("Modules listed."))
    .then(() => {
      return moduleList;
    })
}
