# Preparing your local environment for authoring playwright tests

As part of the first-time setup, you need to run `npx playwright install`. This downloads browser dependencies used by playwright to your local machine. Here's what happened when I ran it:

```bash
~/Head-Start-TTADP $ npx playwright install
Downloading Chromium 108.0.5359.29 (playwright build v1033) from https://playwright.azureedge.net/builds/chromium/1033/chromium-mac-arm64.zip
118 Mb [====================] 100% 0.0s
Chromium 108.0.5359.29 (playwright build v1033) downloaded to /Users/jonpyers/Library/Caches/ms-playwright/chromium-1033
Downloading FFMPEG playwright build v1008 from https://playwright.azureedge.net/builds/ffmpeg/1008/ffmpeg-mac-arm64.zip
1 Mb [====================] 100% 0.0s
FFMPEG playwright build v1008 downloaded to /Users/jonpyers/Library/Caches/ms-playwright/ffmpeg-1008
Downloading Firefox 106.0 (playwright build v1364) from https://playwright.azureedge.net/builds/firefox/1364/firefox-mac-11-arm64.zip
69.2 Mb [====================] 100% 0.0s
Firefox 106.0 (playwright build v1364) downloaded to /Users/jonpyers/Library/Caches/ms-playwright/firefox-1364
Downloading Webkit 16.4 (playwright build v1735) from https://playwright.azureedge.net/builds/webkit/1735/webkit-mac-12-arm64.zip
54.8 Mb [====================] 100% 0.0s
Webkit 16.4 (playwright build v1735) downloaded to /Users/jonpyers/Library/Caches/ms-playwright/webkit-1735
```

Install the playwright VScode extension. This gives you a new `Testing` tab in the VScode sidebar where you can run tests and see the results.

https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright

# Creating tests

## Test generator

See the [official docs](https://playwright.dev/docs/codegen) for the test generator.

In a nutshell, when you have installed the extension mentioned above and navigate to the new `Testing` tab, you should see a `Record new` button near the bottom. Clicking on this button will:

- Create a new test file in the `tests` directory
- Open a new browser window
- Start recording your interactions with the browser

When you're done, just close the browser and the recorder will stop recording. In some cases you will probably need to do some cleanup of the generated test file, but it's a great way to get started.