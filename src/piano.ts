export class Playback {

  bm: BeatMeasure = 0

  increment() {
    this.bm++;
    return this
  }
}

export class Piano {

  keys: Map<PianoKey, Timestamp> = new Map()

  get actives() {
    return this.keys.keys()
  }

  toggle(key: PianoKey, at: Timestamp) {
    if (!this.keys.has(key)) {
      this.keys.set(key, at)
    } else {
      this.keys.delete(key, at)
    }
    return this
  }

  release(key: PianoKey, at: Timestamp) {
    let _begin = this.keys.get(key)
    if (_begin) {
      this.keys.delete(key)
      return at - _begin
    }
    return this
  }
}


