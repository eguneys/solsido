import { time_nb_note_value, time_note_value, make_note_po, is_note, note_pitch, note_duration, note_octave, note_accidental } from './music/types'
import { BeatMeasure, time_bm_duration, time_duration_bm } from './music/types'
import { Tempo } from './music/types'
import { pianokey_pitch_octave } from './music/piano'

import { note_uci } from './music/format/uci'

type InstrumentId = number

type Voice = {
  note: ChordNoteOrRest,
  start: BeatMeasure,
  d_bm: BeatMeasure,
  d_s: number
}

export const tempo_bpms = [0, 10, 60, 90, 120, 180, 220, 400]

export class NotesInBms {

  voices_by_start: Map<BeatMeasure, Voice>

  get bpm() {
    return tempo_bpms[this.tempo]
  }


  tempo_bm_s(time_signature: TimeSignature, bm: BeatMeasure) {
    let bm_per_beat = time_duration_bm(time_signature, 
                                       chord_note_rest_duration(time_note_value(time_signature)))

    let b_ratio = bm / bm_per_beat

    return (60 / this.bpm) * b_ratio
  }

  constructor(readonly tempo: Tempo,
              readonly notes: Array<[TimeSignature, Array<ChordNoteOrRest>]>) {
  
    this.voices_by_start = new Map()

    let bm = 0
    notes.forEach(([time_signature, measures]) =>
      measures.forEach(measure =>
        measure.forEach(note => {
            let duration = chord_note_rest_duration(note)

            let d_bm = time_duration_bm(time_signature, duration)

            let start = bm

            let d_s = this.tempo_bm_s(time_signature, d_bm)
            this.voices_by_start.set(start, {
              start,
              note,
              d_bm,
              d_s
            })

            bm += d_bm
      })))
  }


  voice(bm: BeatMeasure) {
    return this.voices_by_start.get(bm)
  }
}

export class Playback {

  get sub_beat() {
    return this.bm % this.beat_quanti
  }

  get beat() {
    return Math.floor((this.bm % this.measure_quanti) / this.beat_quanti)
  }

  get measure() {

    return Math.floor(this.bm / this.measure_quanti)
  }

  get beat_quanti() {
    return 8
  }

  get measure_quanti() {
    return this.nb_beats * this.beat_quanti
  }

  get nb_beats() {
    return time_nb_note_value(this.time_signature)
  }

  get note_value() {
    return time_note_value(this.time_signature)
  }

  constructor(readonly time_signature: TimeSignature) {}

  bm: BeatMeasure = 0

  increment() {
    this.bm++;
    return this
  }
}

export  type NbVoice = 1 | 2 | 3 | 4
type PianoBind = (key: PianoKey) => () => void

export class Piano {

  keys: Map<BeatMeasure, Array<PianoKey>> = new Map()

  constructor(readonly voices: NbVoice) {}

  get all() {
    return [...this.keys]
  }

  get all_keys() {
    return [...this.keys.values()]
  }

  zero(t: BeatMeasure) {
    return this.keys.get(t) || []
  }

  actives(time_signature: TimeSignature, t: BeatMeasure) {
    return this.all.flatMap(([t0, keys]) => {

      let _duration_bm = t - t0

      if (_duration_bm <= 0) {
        return []
      }

      let duration = time_bm_duration(time_signature, _duration_bm)

      let cnr = keys.map(key => {
        let po = pianokey_pitch_octave(key)
        return make_note_po(po, duration)
      })

      if (cnr.length === 1) { cnr = cnr[0] }
      return [[t0, cnr]]
    })
  }

  push(key: PianoKey, t: BeatMeasure) {
    if (!this.keys.has(t)) {
      this.keys.set(t, [])
    }
    let res = this.keys.get(t)
    if (res.includes(key)) {
      this.keys.delete(t)
      return [t, res]
    }

    res.push(key)
    if (res.length > 1) {
      res.shift()
    }
  }

  release(key: PianoKey) {
    for (let [t, keys] of this.keys) {
      this.keys.set(t, keys.filter(_ => _ !== key))
    }
  }

  release_previous(t: BeatMeasure) {
    let res = []
    for (let t0 of this.keys.keys()) {
      if (t0 < t) {
        res.push([t0, this.keys.get(t0)])
        this.keys.delete(t0)
      }
    }
    return res
  }

  release_all() {
    let res = [...this.keys]
    this.keys = new Map()
    return res
  }
}

export function chord_note_rest_duration(note: ChordOrNoteOrRest) {
  if (Array.isArray(note)) {
    return note_duration(note[0])
  } else if (is_note(note)) {
    return note_duration(note)
  } else {
    return note
  }
}

export function nr_free(nr: NoteOrRest, ctx: Context) {
  if (is_note(nr)) {
    let pitch = note_pitch(nr),
      octave = note_octave(nr),
      duration = note_duration(nr)

    return {
      ox: ctx.x,
      pitch,
      octave,
      duration
    } 

  } else {
    return {
      ox: ctx.x,
      rest: nr
    }
  }
}
