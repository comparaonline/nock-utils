import { expect } from 'chai';
import { HttpRecorder } from '../HttpRecorder';
import * as fs from 'fs';
import * as rest from 'rest';

const TEST_CASSETTE = `${__dirname}/test_cassette.json`;
const TEST_URL = 'https://api.github.com/emojis';

describe('HttpRecorder', () => {

  after(() => {
    fs.unlinkSync(TEST_CASSETTE);
  });

  it('should instantiate a HttpRecorder and set the path', () => {
    const recorder = new HttpRecorder(TEST_CASSETTE);
    expect(recorder.getPath()).to.equal(TEST_CASSETTE);
  });

  it('should return false if a cassette is not present', () => {
    const recorder = new HttpRecorder(TEST_CASSETTE);
    expect(recorder.isCassetteLoaded()).to.be.false;
  });

  it('should record a new cassette when started and be inactive when recording', (done) => {
    let fileExists = fs.existsSync(TEST_CASSETTE);

    expect(fileExists).to.be.false;

    const recorder = new HttpRecorder(TEST_CASSETTE);
    recorder.start();
    
    expect(recorder.isActive()).to.be.false;

    rest(TEST_URL).then(() => {
      recorder.stop();

      fileExists = fs.existsSync(TEST_CASSETTE);
      expect(fileExists).to.be.true;

      done();
    });
  });

  it('should return true when a cassette is loaded', () => {
    const recorder = new HttpRecorder(TEST_CASSETTE);
    expect(recorder.isCassetteLoaded()).to.be.true;
  });

  it('should be active when playing back a cassette', () => {
    const recorder = new HttpRecorder(TEST_CASSETTE);
    expect(recorder.isActive()).to.be.false;
    recorder.start();
    expect(recorder.isActive()).to.be.true;
    recorder.stop();
  });

  it('should play a previously stored cassette without overwriting', (done) => {
    const startCassetteStats = fs.statSync(TEST_CASSETTE);
    const originalModified = startCassetteStats.mtime.getTime();

    const recorder = new HttpRecorder(TEST_CASSETTE);
    recorder.start();

    rest(TEST_URL).then(() => {
      recorder.stop();

      const stopCassetteStats = fs.statSync(TEST_CASSETTE);
      const lastModified = stopCassetteStats.mtime.getTime();

      expect(originalModified).to.equal(lastModified);

      done();
    });

  });
});
