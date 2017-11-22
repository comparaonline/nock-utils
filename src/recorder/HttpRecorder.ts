import * as nock from 'nock';
import * as fs from 'fs';
import * as jsonfile from 'jsonfile';

const WRITE_OPTIONS = {
  spaces: 2,
  EOL: '\r\n',
  flag: 'a'
};

export class HttpRecorder {
  private path: string;

  /**
   * Constructs an HttpRecorder with the path of the cassette to load 
   * or save to.
   * @param path The path to the cassette
   */
  constructor(path: string) {
    this.path = path;
  }

  /**
   * Start will record all http activity to the cassette if it does not 
   * exist or playback a previous http requests if a cassette is present.
   * 
   * Important: Make sure to call @method stop after.
   */
  start() {
    const isLoaded = this.isCassetteLoaded();

    if (isLoaded) {
      this.play();
    } else {
      this.record();
    }
  }

  /**
   * Stop should be called after @method start 
   * It will write to the cassette file if it does not exist and 
   * restore nock to avoid intercepting future http requests.
   */
  stop() {
    const isLoaded = this.isCassetteLoaded();

    if (!isLoaded) {
      this.writeToFile();
    }

    nock.restore();
  }

  private record() {
    nock.recorder.rec({
      dont_print: true,
      output_objects: true,
      use_separator: false,
      enable_reqheaders_recording: false
    });
  }

  private play() {
    if (!nock.isActive()) nock.activate();
    nock.load(this.path);
  }

  private writeToFile() {
    const calls = nock.recorder.play();

    jsonfile.writeFileSync(this.path, calls, WRITE_OPTIONS);
  }

  isCassetteLoaded(): boolean {
    return fs.existsSync(this.path);
  }

  isActive(): boolean {
    return nock.isActive();
  }

  getPath(): string {
    return this.path;
  }
}
