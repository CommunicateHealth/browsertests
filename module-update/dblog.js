/**
 * Runs front-page tests.  Launched by index.js
 * For notes on webdriver, see https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/.
 */

module.exports.test = function(options, webdriver, driver, baseUrl, init = false) {

  const By = webdriver.By,
        path = '/admin/reports/dblog';

  // Load the page
  console.log("checking Recent log messages at " + options.url + path);
  return driver.get(baseUrl + path)

      // Get the title and test that it matches our expectation.
    .then(() => driver.getTitle())
    .then(title => {
      console.log("Opened " + title);
      if (!title.includes('Recent log messages')) {
        return new Promise((resolve, reject) => reject('Error: Got wrong title for page at ' + options.url + path + '!'));
      }
    })

    .then(() => driver.findElements(By.css('.dblog-warning,.dblog-error,.dblog-critical,.dblog-alert,.dblog-emergency')))
    .then((elements) => {
      if (elements.length === 0 ) {
        if (init) {
          console.log("No exising issues in recent log messages.")
        }
        return;
      }
      if (init) {
        return elements[0].findElement(By.css(".views-field-timestamp"))
          .then((stampEl) => stampEl.getAttribute("innerText"))
          .then((stampText) => {
            console.log("Exising issue in recent log messages dated " + stampText)
            options.dblogLast = Date.parse(stampText.replace(" - ", " "));
          });
      }
      return lookForIssue(options, webdriver, driver, elements);
    })
}

function lookForIssue(options, webdriver, driver, elements) {
  const By = webdriver.By,
    element = elements.shift();
  return element.getAttribute("innerText")
    .then((trText) => {
      var tdText = trText.split("\t"),
        logSrc = tdText[1],
        stampText = tdText[2],
        stamp = Date.parse(stampText.replace(" - ", " "));
      // If we are running under docksal, ignore search_api issues if solr isn't running
      if (
        logSrc !== "search_api" ||
        options.url !== "http://nei.docksal.site" ||
        !("SOLR_INDEXED" in process.env) ||
        process.env.SOLR_INDEXED > 0
      ) {
        if (!options.dblogLast || options.dblogLast < stamp) {
          return new Promise((resolve, reject) => reject('Error: Logged: ' + trText + '!'));
        }
      }
      if (elements.length > 0) {
        return lookForIssue(options, webdriver, driver, elements);
      } else {
        console.log("No new issues in recent log messages")
      }
    });
}
