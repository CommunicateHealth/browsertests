// Look for a variety of errors
module.exports.checkForErrors = function(webdriver, driver, options) {
  var pathname;

  return driver.getCurrentUrl()
    .then(currentUrl => pathname = (new URL(currentUrl)).pathname)
    .then(() => module.exports.checkFor200Response(webdriver, driver, options, pathname))
    .then(() => module.exports.inspectH1(webdriver, driver))
    .then(() => module.exports.checkForRobots(webdriver, driver, options))
    .then(() => module.exports.checkForGTM(webdriver, driver))
    .then(() => module.exports.checkForConsoleErrors(webdriver, driver, options))
    .then(() => console.log("No errors on path " + pathname));
}

// Look for any warnings or errors
module.exports.checkForConsoleErrors = function(webdriver, driver, options) {
  const logging = webdriver.logging;
  return driver.manage().logs().get(logging.Type.BROWSER)
    .then(function(entries) {
      var gotErrors = false;
      if (entries && entries.length > 0) {
        entries.forEach(function(entry) {
          if(!entry.message.indexOf("Unrecognized feature: 'interest-cohort'")) {
            console.log('[%s] %s', entry.level.name, entry.message);
            if (entry.level.value > 900) {
              gotErrors = true;
            }
          }
        });
        if (gotErrors && !options.strict) {
          console.log("\n[WARNING] Strict console checks disabled.");
          console.log("[WARNING] Console errors.");
        }
        else if (gotErrors && options.strict) {
          console.log("Console errors.");
          return new Promise((_, reject)=>reject("Error: Console errors."));
        }
        else {
          console.log("No console errors.");
        }
      }
    });
}

module.exports.checkFor200Response = function(webdriver, driver, options, pathname) {
  return  module.exports.httpGetStatus(options.baseUrl + pathname)
    .then((responseCode) => {
      if (responseCode >= 300) return new Promise((_, reject)=>reject("Invalid response code received: " + responseCode));
      console.log("Recieved response code " + responseCode);
    })
}

module.exports.inspectH1 = function(webdriver, driver, options) {
  const By = webdriver.By;

  return  driver.findElements(By.css("h1"))
    .then((elements) => {
      if (elements.length != 1) return new Promise((_, reject)=>reject("Incorrect # of h1's enmcountered: " + elements.length));
      console.log("One h1 element encountered.");
    })
}

module.exports.checkForRobots = function(webdriver, driver, options) {
  const By = webdriver.By;

  return driver.findElements(By.css("head meta[content='noindex, nofollow'"))
    .then((elements) => {
      if (options.baseUrl == "https://www.nei.nih.gov") {
        if (elements.length != 0) {
          return new Promise((_, reject)=>reject("Robots noindex, nofollow directive found on production."));
        }
        console.log("Robots noindex, nofollow is hidden on production.");
      }
      else {
        if (elements.length != 1) {
          return new Promise((_, reject)=>reject("Robots directive not found."));
        }
        console.log("Robots directive found on non-production site.");
      }
    })
}

module.exports.checkForGTM = function(webdriver, driver) {
  const By = webdriver.By;

  // Look for GTM Iframe in <noscript> tag
  return driver.findElement(By.css('noscript'))
    .then(element => element.getAttribute('innerText'))
    .then(text => {
      if(!text.startsWith('<iframe src="https://www.googletagmanager.com/ns.html') || !text.endsWith("</iframe>")) {
        return new Promise((_, reject)=>reject('GTM noscript Iframe missing.'));
      }
    })
    .then(() => console.log("GTM noscript Iframe exists."))

    // Look for GTM script
    .then(() => driver.findElement(By.css('script[src^="/sites/default/files/google_tag/google_tag/www.nei.nih.gov/google_tag.script.js"]')))
    .then(() => console.log("GTM script exists."))

}

module.exports.getKeyByValue = function(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

// Returs only status code from an http get.
module.exports.httpGetStatus = function(url) {
  console.log("Trying " + url);
  return new Promise((resolve, reject) => {
    const http = require('http'),
      https = require('https');

    let client = http;

    if (url.toString().indexOf("https") === 0) {
      client = https;
    }
    client.get(url, (resp) => {
      resolve(resp.statusCode);
    }).on("error", (err) => {
      reject(err);
    });
  });
}

// Returs a buffer. Use .toString('utf-8') to get textcod
module.exports.httpGet = function(url) {
  return new Promise((resolve, reject) => {
    const http = require('http'),
      https = require('https');

    let client = http;

    if (url.toString().indexOf("https") === 0) {
      client = https;
    }

    client.get(url, (resp) => {
      let chunks = [];

      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        chunks.push(chunk);
      });

      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

    }).on("error", (err) => {
      reject(err);
    });
  });
}

// Coverts command line parameters and options to options object
module.exports.process_options = function(args, config) {
  var options = {}, parameterIndex=0;
  args.forEach(function(arg) {
    var argParts = arg.split("=");
    if (argParts.length > 1) {
      let optName = argParts[0];
      while (optName.indexOf("-") === 0) {
        optName = optName.substr(1);
      }
      if (optName.length > 0) {
        options[optName] = argParts.splice(1).join("=");
      }
    } else if (argParts.length == 1) {
      // Deal with parameters
      ++parameterIndex;
      switch(parameterIndex) {
        // set -url= via [sitename or url or json] parameter
        case 3:
          if (arg.startsWith("https://") || arg.startsWith("http://")) {
            // deal with url specified verbatim
            options.url = arg;
          } else if (arg.startsWith("{")) {
            // deal with options specified as json
            options = Object.assign(options, JSON.parse(arg))
          } else {
            // deal with options specifed by name from config.js
            config.siteOptions.forEach((siteOption) => {
              if(!siteOption.names || !siteOption.options) {
                return;
              }
              siteOption.names.forEach((siteOptionName) => {
                if (siteOptionName == arg) {
                  options = Object.assign(options, siteOption.options);
                }
              });
            });
          }
          break;
        case 4:
          options.user = arg;
          break;
        case 5:
          options.pass = arg;
          break;
        case 6:
          options.loginUser = arg;
          break;
        case 7:
          options.loginPass = arg;
          break;
      }
    }
  });
  // If we haven't specified a URL, go with the default one
  if (!options.url) {
    config.siteOptions.forEach((siteOption) => {
      if(!siteOption.names || !siteOption.options) {
        return;
      }
      siteOption.names.forEach((siteOptionName) => {
        if (siteOptionName === "default") {
          options.url = siteOption.options.url;
        }
      });
    });
  }
  // Modify the URL to get past basic authentication
  options.baseUrl = options.url;
  if (options.user && options.pass) {
    let basicAuth = options.user + ":" + options.pass;
    options.baseUrl = options.baseUrl.replace("://", "://" + basicAuth + "@")
  }

  if(options.showOptions) console.log(options);

  return options;
};

module.exports.ignoreConsoleErrors = function (webdriver, driver) {
  const logging = webdriver.logging;
  var pathname;

  return driver.getCurrentUrl()
    .then(currentUrl => pathname = (new URL(currentUrl)).pathname)
    .then(() => driver.manage().logs().get(logging.Type.BROWSER))
}

// Reload the currenrt page with a cache-busting parameter in its url
module.exports.bustCache = function (webdriver, driver) {
  return driver.getCurrentUrl()
    .then(currentUrl => {
      var url = module.exports.bustCacheUrl(currentUrl);
      return module.exports.getAndWaitForReload(webdriver, driver, url);
    });
}

// Adds a cache-busting parameter to a url string
module.exports.bustCacheUrl = function (urlString) {
  var url = new URL(urlString);
  url.searchParams.set('cacheBuster', (Math.random() + '').substr(2, 6))
  return url;
}

// Clicks an element and waits for a new page to load
module.exports.clickAndWaitForReload = function (webdriver, driver, element, tries = 2) {
  return element.click()
    .then(() => module.exports.waitForReload(webdriver, driver, element))
    .then((reloaded) => {
      if (!reloaded && tries > 1) {
        return driver.getCurrentUrl()
          .then(url => {
            console.log("Trying to reload " + url);
            return url;
          })
          .then(url => module.exports.getAndWaitForReload(webdriver, driver, url, tries - 1));
      }
    });
}

// Assumes a page is already open -- opens a new page and returns body
module.exports.getAndWaitForReload = function (webdriver, driver, url, tries = 2) {
  const By = webdriver.By;
  var body;
  return driver.findElement(By.css('body'))
    .then((_body) => body = _body)
    .then(() => driver.get(url))
    .then(() => module.exports.waitForReload(webdriver, driver, body))
    .then((reloaded) => {
      if (!reloaded && tries > 1) {
        console.log("Trying to reload " + url);
        return module.exports.getAndWaitForReload(webdriver, driver, url, tries -1);
      }
    });
}

// Waits for page to reload, returns body
module.exports.waitForReload = function (webdriver, driver, element, interval = 2000, tries = 30) {
  const By = webdriver.By,
    until = webdriver.until;
  var promise;
  if (element) {
    promise = driver.wait(until.stalenessOf(element), 30000);
  } else {
    promise = driver.sleep(5000);
  }
  return promise
    .then(() => driver.wait(until.elementLocated(By.css('body')), 30000))
    .then(() => module.exports.waitForReadyStateComplete(driver, interval, tries))
    .then((gotReadyState) => {
      if (gotReadyState) {
        return module.exports.waitForTitle(driver, interval, tries);
      }
      return false;
    })
}

// Waits for document.readyState to equal "complete"
module.exports.waitForReadyStateComplete = function (driver, interval, tries) {
  return driver.executeScript('return document.readyState')
    .then(function (readyState) {
      if (readyState != 'complete' && tries > 1) {
        console.log("Waiting for document to fully load...")
        return driver.sleep(interval)
          .then(() => module.exports.waitForReadyStateComplete(driver, interval, tries - 1));
      }
      return readyState == 'complete';
    });
}

// Waits for driver.getTitle() to return a non-empty value
module.exports.waitForTitle = function (driver, interval, tries) {
  return driver.getTitle()
    .then(function (title) {
      if (!title && tries > 1) {
        console.log("Waiting for page title to become available...")
        return driver.sleep(interval)
          /*.then(() => driver.executeScript('return document.title'))
          .then((doc_title) => console.log("document.title is \"" + doc_title + "\""))
          .then(() => driver.executeScript('return document.location.href'))
          .then((doc_loc) => console.log("document.location.href is \"" + doc_loc + "\""))*/
          .then(() => module.exports.waitForTitle(driver, interval, tries - 1));
      }
      return !!title;
    });
}
