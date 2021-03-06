# nock-utils
Utility tools to simplify recording and playing back http requests during tests

## Quick Example

```javascript
const nockUtils = require('nock-utils');
const recorder = new nockUtils.HttpRecorder('cassette.json');
recorder.start();

// Call http requests here.

recorder.stop();
```

## Complete Example
```javascript
// Import nock-utils
const nockUtils = require('nock-utils');
const rest = require('rest');

// Instantiate HttpRecorder passing the cassette location.
const recorder = new nockUtils.HttpRecorder('cassette.json');
const startTime = new Date();

// If cassette.json DOES NOT exist it will start recording all http transactions.
// If cassette.json DOES exist it will playback http requests contained in the cassette.
recorder.start();

rest('https://www.comparaonline.com').then((result) => {

  // This will stop recording and save a new cassette or reset nock.
  recorder.stop();

  const elapsedMilliseconds = new Date() - startTime;
  console.log(elapsedMilliseconds);
});
```

## Testing all mocks ran

You can validate all mocks were executed by passing a true to the `nock.stop` method:
```javascript
async () => {
  recorder.start();
  await rest('https://www.comparaonline.com');
  recorder.stop(true); // This will throw if the cassette had more mocks than just that request.
}
```

## Installation

With npm:
```sh
$ npm install --save-dev nock-utils
```
With yarn:
```sh
$ yarn add --dev nock-utils
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
