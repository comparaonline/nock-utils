import { expect } from 'chai';
import { HttpRecorder } from '../HttpRecorder';
import * as fs from 'fs';
import * as rest from 'rest';
import * as express from 'express';

const app = express()

const TEST_CASSETTE = `${__dirname}/test_cassette.json`;
const TEST_CASSETTE_DUPLICATE = `${__dirname}/test_cassette_duplicate.json`;
const TEST_URL = 'http://127.0.0.1:3000';
const TEST_RESULT = 'result_ok';
const TEST_RANDOM_URL = `${TEST_URL}/random`;
const MAX_DUPLICATE_FILE_SIZE = 500;

const startServer = () => {
  app.get('/', (req, res) => res.json(TEST_RESULT))
  app.get('/random', (req, res) => res.json(
    {magicNumber: Math.floor(Math.random() * 1000000)}
  ));
  return app.listen(3000, () => {});
};

async function createCassette() {
  const recorder = new HttpRecorder(TEST_CASSETTE);
    recorder.start();
    return rest(TEST_URL).then((result) => {
      recorder.stop();
      return result;
    });
}

let server;

describe('HttpRecorder', () => {

  before(() => {
    server = startServer();
  });

  after(() => {
    server.close();
  });

  afterEach(() => {
    if (fs.existsSync(TEST_CASSETTE)) {
      fs.unlinkSync(TEST_CASSETTE);
    }
  });

  it('should instantiate a HttpRecorder and set the path', () => {
    const recorder = new HttpRecorder(TEST_CASSETTE);
    expect(recorder.getPath()).to.equal(TEST_CASSETTE);
  });

  it('should return false if a cassette is not present', () => {
    const recorder = new HttpRecorder(TEST_CASSETTE);
    expect(recorder.isCassetteLoaded()).to.be.false;
  });

  it('should record a new cassette when started and be inactive when recording', async () => {
    let fileExists = fs.existsSync(TEST_CASSETTE);
    expect(fileExists).to.be.false;

    const recorder = new HttpRecorder(TEST_CASSETTE);
    recorder.start();
    expect(recorder.isActive()).to.be.false;

    const result = await rest(TEST_URL);
    recorder.stop();

    fileExists = fs.existsSync(TEST_CASSETTE);
    expect(fileExists).to.be.true;

    const testCassette = JSON.parse(fs.readFileSync(TEST_CASSETTE, 'utf8'));
    expect(testCassette[0].response).to.equal(TEST_RESULT);
  });

  it('should return true when a cassette is loaded', async () => {
    const recorder = new HttpRecorder(TEST_CASSETTE);
    recorder.start();
    expect(recorder.isActive()).to.be.false;

    await rest(TEST_URL);

    recorder.stop();
    expect(recorder.isCassetteLoaded()).to.be.true;
  });

  it('should be active when playing back a cassette', async () => {
    const recorder = new HttpRecorder(TEST_CASSETTE);
    recorder.start();
    expect(recorder.isActive()).to.be.false;

    await rest(TEST_URL);

    recorder.stop();
    expect(recorder.isActive()).to.be.false;
    recorder.start();
    expect(recorder.isActive()).to.be.true;

    await rest(TEST_URL);

    recorder.stop();
    expect(recorder.isActive()).to.be.false;
  });

  it('should play a previously stored cassette without overwriting', async () => {
    await createCassette();

    const startCassetteStats = fs.statSync(TEST_CASSETTE);
    const originalModified = startCassetteStats.mtime.getTime();

    const recorder = new HttpRecorder(TEST_CASSETTE);
    recorder.start();

    await rest(TEST_URL);
    recorder.stop();

    const stopCassetteStats = fs.statSync(TEST_CASSETTE);
    const lastModified = stopCassetteStats.mtime.getTime();

    expect(originalModified).to.equal(lastModified);

    const testCassette = JSON.parse(fs.readFileSync(TEST_CASSETTE, 'utf8'));
    expect(testCassette[0].response).to.equal(TEST_RESULT);
  });

  it('should allow changing the default recording options', async () => {
    const EXPECTED_HEADERS = { 'content-length': 0, host: '127.0.0.1:3000' };
    let fileExists = fs.existsSync(TEST_CASSETTE);
    expect(fileExists).to.be.false;

    const recorder = new HttpRecorder(TEST_CASSETTE);
    recorder.start({
      enable_reqheaders_recording: true
    });
    expect(recorder.isActive()).to.be.false;

    const result = await rest(TEST_URL);
    recorder.stop();

    fileExists = fs.existsSync(TEST_CASSETTE);
    expect(fileExists).to.be.true;

    const testCassette = JSON.parse(fs.readFileSync(TEST_CASSETTE, 'utf8'));
    expect(testCassette[0].reqheaders).to.deep.equal(EXPECTED_HEADERS);
  });

  it('should allow to blacklist certain scopes from recording', async () => {
    const IGNORED_SCOPES = [TEST_URL];
    const recorder = new HttpRecorder(TEST_CASSETTE, IGNORED_SCOPES);
    recorder.start();
    const firstResult = await rest(TEST_RANDOM_URL);
    const firstNumber = JSON.parse(firstResult.entity).magicNumber;
    recorder.stop();

    recorder.start();
    const secondResult = await rest(TEST_RANDOM_URL);
    const secondNumber = JSON.parse(secondResult.entity).magicNumber;
    recorder.stop();
    
    expect(firstNumber).to.not.be.eql(secondNumber);
  });
});

describe('Restrict Content by File', () => {
  before(() => {
    server = startServer();
  });

  after(() => {
    server.close();
  });

  afterEach(() => {
    if (fs.existsSync(TEST_CASSETTE_DUPLICATE)) {
      fs.unlinkSync(TEST_CASSETTE_DUPLICATE);
    }
  });

  it('should validate the test cassette does not exist', async () => {
    let fileExistsInitial = fs.existsSync(TEST_CASSETTE_DUPLICATE);
    expect(fileExistsInitial).to.be.false;
  });

  it('should create a file and write content without previous tests', async () => {
    const recorder = new HttpRecorder(TEST_CASSETTE_DUPLICATE);
    recorder.start();
    const result = await rest(TEST_URL);
    recorder.stop();

    const cassetteStats = fs.statSync(TEST_CASSETTE_DUPLICATE);
    expect(cassetteStats.size).lt(MAX_DUPLICATE_FILE_SIZE);
  });
});
