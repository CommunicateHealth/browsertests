/**
 * Runs node module regression tests.  Launched by index.js
 * For notes on webdriver, see https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/.
 */

module.exports.test = function(options, webdriver, driver, baseUrl) {
  const By = webdriver.By,
        test_utils = require('../test-utils.js'),
        path = '/node/add/page';
  var totalItems;

  console.log(
    "\n\x1b[33m%s\x1b[0m",
    "Testing the node module"
  );

  // Add new node: /node/add/page
  console.log("Opening page at " + options.url + path);
  return driver.get(baseUrl + path)
    // Get the title and test that it matches our expectation.
    .then(() => driver.getTitle())
    .then((title) => {
      console.log("Opened " + title);
      if(!title.includes('Create Basic page')) {
        return new Promise((resolve, reject) => reject('Error: Got wrong title for page at ' + options.url + path + '!'));
      }
    })

    // Add minimal content
    .then(() => console.log("Generating test page"))
    .then(() => driver.findElement(By.id('edit-title-0-value')))
    .then((element) => element.sendKeys("Test page generated at " + new Date().toGMTString()))

    .then(() => driver.findElements(By.id('edit-moderation-state-0-state')))
    .then((elements) => {
      if (elements.length > 0) {
        return testNodeWithModerationStates(webdriver, driver, elements[0]);
      }
      return testNodeWithStatus(webdriver, driver);
    })

    // Delete node
    .then(() => console.log("Deleting node"))
    .then(() => driver.findElement(By.xpath("//main//ul/li/a[contains(text(),'Delete')]")))
    .then((element) => test_utils.clickAndWaitForReload(webdriver, driver, element))
    .then(() => driver.findElement(By.id('edit-submit')))
    .then((element) => test_utils.clickAndWaitForReload(webdriver, driver, element))

    .then(() => console.log("Done testing Node"));
}

function testNodeWithModerationStates(webdriver, driver, moderationStateSelect) {
  const By = webdriver.By,
    test_utils = require('../test-utils.js');
  // Set content to Draft, Save
  console.log("Setting new content to Draft")
  return moderationStateSelect.sendKeys("draft")
    .then(() => driver.findElement(By.id('edit-submit')))
    .then((element) => test_utils.clickAndWaitForReload(webdriver, driver, element))

    // Set content to Published, Save
    .then(() => console.log("Changing content to Published"))
    .then(() => driver.findElement(By.xpath("//main//ul/li/a[contains(text(),'Edit')]")))
    .then((element) => test_utils.clickAndWaitForReload(webdriver, driver, element))
    .then(() => driver.findElement(By.id('edit-moderation-state-0-state')))
    .then((element) => element.sendKeys("published"))
    .then(() => driver.findElement(By.id('edit-submit')))
    .then((element) => test_utils.clickAndWaitForReload(webdriver, driver, element))

    // Set content to Unpublished, Save
    .then(() => console.log("Changing content to Unpublished"))
    .then(() => driver.findElement(By.xpath("//main//ul/li/a[contains(text(),'Edit')]")))
    .then((element) => test_utils.clickAndWaitForReload(webdriver, driver, element))
    .then(() => driver.findElement(By.id('edit-moderation-state-0-state')))
    .then((element) => element.sendKeys("unpublished"))
    .then(() => driver.findElement(By.id('edit-submit')))
    .then((element) => test_utils.clickAndWaitForReload(webdriver, driver, element))

    // Set content to Archived, Save
    .then(() => console.log("Changing content to Archived"))
    .then(() => driver.findElement(By.xpath("//main//ul/li/a[contains(text(),'Edit')]")))
    .then((element) => test_utils.clickAndWaitForReload(webdriver, driver, element))
    .then(() => driver.findElement(By.id('edit-moderation-state-0-state')))
    .then((element) => element.sendKeys("archived"))
    .then(() => driver.findElement(By.id('edit-submit')))
    .then((element) => test_utils.clickAndWaitForReload(webdriver, driver, element))

}

function testNodeWithStatus(webdriver, driver) {
  const By = webdriver.By,
    test_utils = require('../test-utils.js');
  var checkbox;
  console.log("Setting new content to Published state")
  return driver.findElement(By.id('edit-status-value'))
    .then((element) => {
      checkbox = element;
      return checkbox.isSelected()
    })
    .then((selected) => {
      if (!selected) {
        return checkbox.click();
      }
    })
    .then(() => driver.findElement(By.id('edit-submit')))
    .then((element) => test_utils.clickAndWaitForReload(webdriver, driver, element))

    // Edit content to change state
    .then(() => console.log("Changing content to Not Published state"))
    .then(() => driver.findElement(By.xpath("//main//ul/li/a[contains(text(),'Edit')]")))
    .then((element) => test_utils.clickAndWaitForReload(webdriver, driver, element))
    .then(() => driver.findElement(By.id('edit-status-value')))
    .then((checkbox) => checkbox.click())
    .then(() => driver.findElement(By.id('edit-submit')))
    .then((element) => test_utils.clickAndWaitForReload(webdriver, driver, element))
}
