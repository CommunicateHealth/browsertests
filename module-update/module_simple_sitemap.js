/**
 * Runs simple sitemap module regression tests.  Launched by index.js
 * For notes on webdriver, see https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/.
 */

module.exports.test = function(options, webdriver, driver, baseUrl) {
  const By = webdriver.By,
        config = require(process.env.PWD + '/browser-tests/config.js'),
        test_utils = require('../test-utils.js'),
        path = '/admin/config/search/simplesitemap';
  var totalItems;

  console.log(
    "\n\x1b[33m%s\x1b[0m",
    "Testing the simple_sitemap module"
  );
    // Load the page
  console.log("Opening page at " + options.url + path);
  return driver.get(baseUrl + path)

    // Get the title and test that it matches our expectation.
    .then(() => driver.getTitle())
    .then((title) => {
      console.log("Opened " + title);
      if(!title.includes('Simple XML Sitemap')) {
        return new Promise((resolve, reject) => reject('Error: Got wrong title for page at ' + options.url + path + '!'));
      }
    })

    // Click on rebuild queue button
    .then(() => driver.findElement(By.id('edit-regenerate-submit')))
    .then((element) => test_utils.clickAndWaitForReload(webdriver, driver, element))

    // Stay on the Generating XML sitemaps page for a bit
    .then(() => waitForBatchToFinish(webdriver, driver, test_utils))

    // Check the generated sitemap
    .then(() => console.log("Reading sitemap.xml"))
    .then(() => test_utils.readSitemap(webdriver, driver, baseUrl))
    .then((sitemapEntries) => {
      console.log("Got " + sitemapEntries.length + " sitemap.xml entries.")
      if (sitemapEntries.length < config.testParams.minSitemapEntries) {
        return new Promise((resolve, reject) => reject('Error: Expected at least ' + config.testParams.minSitemapEntries + ' entries!'));
      }
    })

    .then(() => console.log("Done testing Simple Sitemap"));
}

function waitForBatchToFinish(webdriver, driver, test_utils, titleText = "", progressText = "", tries = 100) {
  const By = webdriver.By;
  var progressEl;
  return driver.getTitle()
    .then((title) => {
      if (title !== titleText) {
        console.log("Opened " + title);
        titleText = title;
      }
      if (tries > 0 && title.includes('Generating XML sitemaps')) {
        return driver.findElement(By.id('updateprogress'))
          .then((element) => progressEl = element)
          .then(() => progressEl.getAttribute("innerText"))
          .then((innerText) => {
            if (innerText !== progressText) {
              console.log(progressText)
              progressText = innerText;
            }
          })
          .then(() => driver.sleep(2000))
          .then(() => waitForBatchToFinish(webdriver, driver, test_utils, titleText, progressText, tries -1));
      } else if (tries > 0 && title.includes('Simple XML Sitemap')) {
        return;
      } else if (tries > 0 ) {
        return new Promise((resolve, reject) => reject('Error: Got wrong title for Generating XML sitemaps page!'));
      } else {
        return new Promise((resolve, reject) => reject('Error: Timed out generating XML sitemaps!'));
      }
    })
}
