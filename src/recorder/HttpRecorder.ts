import * as nock from 'nock'
import * as fs from 'fs'
import * as jsonfile from 'jsonfile'
import { inspect } from 'util'

export interface RecordOptions {
  dont_print: boolean
  output_objects: boolean
  use_separator: boolean
  enable_reqheaders_recording: boolean
}

const WRITE_OPTIONS = {
  spaces: 2,
  EOL: '\r\n',
  flag: 'a'
}

const DEFAULT_RECORD_OPTIONS: RecordOptions = {
  dont_print: true,
  output_objects: true,
  use_separator: false,
  enable_reqheaders_recording: false
}

export class HttpRecorder {
  private readonly path: string

  /**
   * Constructs an HttpRecorder with the path of the cassette to load
   * or save to.
   * @param path The path to the cassette
   */
  constructor (path: string) {
    this.path = path
  }

  /**
   * Start will record all http activity to the cassette if it does not
   * exist or playback a previous http requests if a cassette is present.
   *
   * Important: Make sure to call @method stop after.
   * @param options Optional options to change the default ones
   */
  start (options: Partial<RecordOptions> = {}): void {
    const isLoaded = this.isCassetteLoaded()
    const recordOptions = { ...DEFAULT_RECORD_OPTIONS, ...options }

    if (isLoaded) {
      nock.disableNetConnect()
      this.play()
    } else {
      this.record(recordOptions)
    }
  }

  /**
   *
   * Call this to enable connections to happen with specific hosts (if a host
   * argument is provided) or with any reachable host when the recorder is in
   * play mode.
   * If a request is in the cassette, it will be returned from there, but if it
   * isn't and netConnect was enabled it will be retrieved from the server.
   * @param host Optional The host or IP that will be enabled (can be a regexp)
   */
  enableNetConnect (host?: string | RegExp): void {
    nock.enableNetConnect(host)
  }

  /**
   * Stop should be called after @method start
   * It will write to the cassette file if it does not exist and
   * restore nock to avoid intercepting future http requests.
   */
  stop (checkAllRan = false): void {
    const isLoaded = this.isCassetteLoaded()

    if (!isLoaded) {
      this.writeToFile()
    }
    try {
      if (checkAllRan && !nock.isDone()) {
        const pending = inspect(nock.pendingMocks(), false, 3, false)
        throw new Error(`The following mocks didn't run: ${pending}`)
      }
    } finally {
      nock.restore()
      nock.cleanAll()
      this.enableNetConnect()
    }
  }

  private record (options: RecordOptions): void {
    nock.recorder.rec(options)
  }

  private play (): void {
    if (!nock.isActive()) nock.activate()
    nock.load(this.path)
  }

  private writeToFile (): void {
    const calls = nock.recorder.play()

    jsonfile.writeFileSync(this.path, calls, WRITE_OPTIONS)
    nock.recorder.clear()
  }

  isCassetteLoaded (): boolean {
    return fs.existsSync(this.path)
  }

  isActive (): boolean {
    return nock.isActive()
  }

  getPath (): string {
    return this.path
  }
}
