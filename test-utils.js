// Load a page, trying a few times if a 403 error is encountered
module.exports.reloadIf403 = function(webdriver, driver, tries=8, retryWait=10000) {
  const By = webdriver.By,
        until = webdriver.until;
  return driver.wait(until.elementLocated(By.css('body')),30000)
    .then((body) => driver.executeScript('return arguments[0].innerText', body))
    .then((bodyText) => {
      bodyText = bodyText.substr(0,15);
      if (bodyText.includes("403") || bodyText.includes("Forbidden")) {
        if (tries > 0) {
          console.log("Got 403 Forbidden response, reloading...")
          return driver.sleep(retryWait)
            .then(() => driver.navigate().refresh())
            .then(() => module.exports.reloadIf403(webdriver, driver, tries - 1, retryWait))
        }
        return module.exports.throwError("Error: Too many 403 Forbidden reponses.");
      }
    });
}

// Log an error.
module.exports.logError = function(err) {
  console.error("\n\x1b[31m\x1b[7m%s\x1b[0m", "Caught error:", err);
  process.exitCode = (process.exitCode ?? 0) + 1;
}

// Throw an error. Should be returned in a promise.
module.exports.throwError = function(err) {
  return new Promise((_, reject)=>reject(err));
}

// Look for a variety of errors
module.exports.checkForErrors = function(webdriver, driver, options) {
  var pathname,
    errorCount = process.exitCode ?? 0;

  return driver.getCurrentUrl()
    .then(currentUrl => pathname = (new URL(currentUrl)).pathname)
    .then(() => module.exports.checkFor200Response(webdriver, driver, options, pathname))
    .then(() => module.exports.inspectH1(webdriver, driver))
    .then(() => module.exports.checkForGTM(webdriver, driver))
    .then(() => {
      if (options.jumplinks) {
        return module.exports.checkJumpLinks(webdriver, driver, options);
      }
    })
    .then(() => {
      if (options.accessibility) {
        return module.exports.checkAccessibility(webdriver, driver, options);
      }
    })
    .then(() => module.exports.checkForConsoleErrors(webdriver, driver, options))
    .then(() => {
      errorCount = (process.exitCode ?? 0) - errorCount;
      if (errorCount === 0) {
        console.log("No errors on path " + pathname);
      } else {
        console.warn("\x1b[33m%s\x1b[0m", errorCount + " error" + (errorCount > 1 ? "s" : "") + " on path " + pathname);
      }
    });
}

// Look for any warnings or errors
module.exports.checkForConsoleErrors = function(webdriver, driver, options) {
  const logging = webdriver.logging;
  return driver.manage().logs().get(logging.Type.BROWSER)
    .then(function(entries) {
      var gotErrors = false;
      if (entries && entries.length > 0) {
        entries.forEach(function(entry) {
          if(!entry.message.includes("Unrecognized feature: 'interest-cohort'")) {
            console.log('[%s] %s', entry.level.name, entry.message);
            if (typeof options.strict === 'string' && entry.message.match(options.strict)) {
              console.log("[WARNING] ignored console error matching '" + options.strict + "'");
              return;
            }
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
          return module.exports.throwError("Error: Console errors.");
        }
        else {
          console.log("No console errors.");
        }
      }
    });
}

module.exports.checkFor200Response = function(webdriver, driver, options, pathname) {
  return  module.exports.httpGetStatus(webdriver, driver, options, pathname)
    .then((responseCode) => {
      if (responseCode >= 300) return module.exports.throwError("Invalid response code received: " + responseCode);
      console.log("Recieved response code " + responseCode);
    })
}

module.exports.inspectH1 = function(webdriver, driver, options) {
  const By = webdriver.By;

  return  driver.findElements(By.css("h1"))
    .then((elements) => {
      if (elements.length != 1) return module.exports.throwError("Incorrect # of h1's enmcountered: " + elements.length);
      console.log("One h1 element encountered.");
    })
}

module.exports.checkForGTM = function(webdriver, driver, options) {
  const By = webdriver.By,
        config = require(process.env.PWD + '/browser-tests/config.js');
  var scriptSelector = '',
      gotNoScript = false;
  if (!Array.isArray(config.gtmOptions.scriptSrc)) {
    config.gtmOptions.scriptSrc = [config.gtmOptions.scriptSrc];
  }
  config.gtmOptions.scriptSrc.forEach(scriptSrc => {
    if (scriptSelector !== '') {
      scriptSelector += ",";
    }
    scriptSelector+='script[src*="'+scriptSrc+'"]';
  });

  // Look for GTM Iframe in <noscript> tag
  return driver.findElements(By.css('noscript'))
    .then((elements) => {
      return elements.reduce((promise, element) => {
        return promise.then(() => element.getAttribute('innerText'))
          .then((text) => gotNoScript |= text.startsWith('<iframe src="https://www.googletagmanager.com/ns.html') && text.endsWith("</iframe>"))
      }, Promise.resolve());
    })
    .then(() => {
      if(!gotNoScript && config.gtmOptions.noscript !== false) {
        return module.exports.throwError('GTM noscript Iframe missing.');
      }
    })
    .then(() => {
      if (config.gtmOptions.noscript !== false) {
        console.log("GTM noscript Iframe exists.");
      }
    })

    // Look for GTM script
    .then(() => driver.findElements(By.css(scriptSelector)))
    .then((gtmScripts) => {
      if (gtmScripts.length == 0) {
        return new module.exports.throwError('GTM script missing.');
      }
    })
    .then(() => console.log("GTM script exists."))
}

module.exports.checkJumpLinks = function(webdriver, driver, options) {
  const By = webdriver.By;

  console.log("Checking internal jump links.");
  return driver.findElements(By.css('a[href^="#"]:not([href$="#"]'))
    .then((jumplinks) => {
      var promise = Promise.resolve();
      jumplinks.forEach(jumplink => {
        promise = promise.then(() => jumplink.getAttribute("href"))
          .then((href) => {
            var id = decodeURIComponent(href).replace(/.*#/, "");
            if (id === "top") {
              return;
            }
            return driver.findElements(By.css('*[id="' + id + '"]'))
              .then((elements) => {
                if (elements.length === 0) {
                  module.exports.logError("Missing target for jumplink #" + id);
                } else if (elements.length > 1) {
                  module.exports.logError("Multiple targets for jumplink #" + id);
                }
              });
          });
      });
      return promise;
    });
}

module.exports.checkAccessibility = function(webdriver, driver, options) {
  const { AxeBuilder } = require('@axe-core/webdriverjs');
  console.log("Checking accessibility.");
  return new AxeBuilder(driver)
    .analyze()
    .then(results => {
      if (results.violations) {
        results.violations.forEach(result => {
          result.nodes.forEach((node, index) => {
            if ((options.accessibilityIgnoteTargets ?? []).some((ignoreTarget) => {
              return node.target.includes(ignoreTarget);
            })) {
              // if the node's target matches one of the accessibilityIgnoteTargets, then set it for ignoring.
              result.nodes[index] = null;
            } else {
              result.nodes[index] = {
                html: node.html,
                target: node.target,
              }
            }
          });
          // Remove ignored nodes.
          result.nodes = result.nodes.filter((node) => node !== null);
          if (result.nodes.length === 0) {
            return;
          }
          // Reduce verbosity.
          delete result.tags;
          module.exports.logError("Axe violation" + JSON.stringify(result, null, 2));
        });
      }
    });
}

module.exports.getKeyByValue = function(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

// Returs only status code from an http get.
module.exports.httpGetStatus = function(webdriver, driver, options, url) {
  console.log("Trying " + url);

  return driver.executeScript("selenium_response_code=-1;fetch(location.origin+'" +
      url +
      "').then((response)=>{selenium_response_code=response.status})")
    .then(() => waitForStatus(driver, 60))
}

// Waits for status to be assigned to selenium_response_code JS variable
function waitForStatus(driver, tries) {
  return driver.executeScript("return selenium_response_code;")
    .then ((responseCode) => {
      if (responseCode !== -1) {
        return responseCode;
      }
      if (tries <= 1) {
        return 599;
      }
      return driver.sleep(500)
        .then(() => waitForStatus(driver, tries-1))
    })
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
module.exports.process_options = function(args, config)  {
  var options = config.defaultOptions ?? {},
      parameterIndex = 0;
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
    } else if (arg.indexOf("-") === 0) {
      while (arg.indexOf("-") === 0) {
        arg = arg.substr(1);
      }
      if (arg.length > 0) {
        options[arg] = true;
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
          .then(() => module.exports.waitForTitle(driver, interval, tries - 1));
      }
      return !!title;
    });
}

// Waits for element to be displayed and enabled
module.exports.waitForDisplayedAndEnabled = function(driver, element, delay=30000) {
  return driver.wait(() => {
    return element.isDisplayed()
      .then((displayed) => {
        if (!displayed) {
            return false;
        }
        return element.isEnabled();
      });
  }, delay)
}

// Read (optionally nested) sitemap.xml file(s)
module.exports.readSitemap = function (webdriver, driver, baseUrl, path = '/sitemap.xml') {
  const xmlRegex = /<loc>([^<]+)<\/loc>[\s\S]*?<lastmod>([^<]+)<\/lastmod>/gi;
  var mapEntries = [];
  // Load the page, which either contains a sitemapindex section or a urlset section
  return module.exports.httpGet(baseUrl + path)
    .then((xmlBuffer) => {
      var xml = xmlBuffer.toString('utf-8'),
        entryNum = 1;
      var indexSection = xml.match(/<sitemapindex[^>]+>[\s\S]*<\/sitemapindex>/g);
      if (indexSection) {
        var promise = Promise.resolve();
        while ((match = xmlRegex.exec(indexSection[0])) !== null) {
          let subUrl = new URL(match[1]),
            subPath = subUrl.pathname + subUrl.search + subUrl.hash;
          promise = promise.then(() => module.exports.readSitemap(webdriver, driver, baseUrl, subPath))
            .then((_mapEntries) => mapEntries = mapEntries.concat(_mapEntries));
        }
        return promise.then(() => {
          return mapEntries;
        });
      }
      var urlSetSection = xml.match(/<urlset[^>]+>[\s\S]*<\/urlset>/g);
      if (urlSetSection) {
        while ((match = xmlRegex.exec(urlSetSection[0])) !== null) {
          let mapEntry = {
            path: (new URL(match[1])).pathname,
            date: new Date(match[2]),
            type: "#" + entryNum
          };
          ++entryNum;
          mapEntries.push(mapEntry);
        }
      }
      return mapEntries;
    });
}
