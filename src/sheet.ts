import { time_note_value, time_nb_note_value } from './music/types'
import { is_note, note_pitch, note_octave, note_duration, note_accidental } from './music/types'

const fsum = (a, b) => a + b

export const note_free = note => {
  let pitch = note_pitch(note),
    octave = note_octave(note),
    duration = note_duration(note),
    accidental = note_accidental(note)

  return {
    pitch,
    octave,
    duration,
    accidental
  }
}

export class BeatSheet {
  subs: Array<ChordNoteOrRest>

  get w() {
    return this.subs.length * this.sub_w
  }

  get sub_w() {
    return 1
  }

  get time_signature() {
    return this.measure.time_signature
  }

  constructor(readonly measure: MeasureSheet) {

    let note_value = time_note_value(this.time_signature)
    this.subs = [note_value]
  }

  add_cnr(_sub: number, cnr: ChordNoteOrRest) {
    this.subs[_sub] = cnr
  }
}

export class MeasureSheet {

  beats: Array<BeatSheet>

  get w() {
    return this.beats.map(_ => _.w).reduce(fsum)
  }

  get time_signature() {
    return this.sheet.time_signature
  }

  constructor(readonly sheet: ComposeSheet) {
    let nb_beats = time_nb_note_value(this.time_signature)
    this.beats = [...Array(nb_beats)].map(_ => new BeatSheet(this))
  }

  add_cnr(_beat: number, _sub: number, cnr: ChordNoteOrRest) {
    let beat = this.beats[_beat]
    beat.add_cnr(_sub, cnr)
  }
}

export class ComposeSheet {

  measures: Array<MeasureSheet> = []

  get w() {
    return this.measures.map(_ => _.w).reduce(fsum)
  }

  get notes() {
    let m_x = 0
    return this.measures.flatMap(measure => {
      let b_x = 0
      let m_res = measure.beats.flatMap(beat => {
        let s_x = 0
        let b_res = beat.subs.map(sub => {
          let x = m_x + b_x + s_x
          let cnr
          if (Array.isArray(sub)) {
            cnr = sub.map(note_free)
          } else if (is_note(sub)) {
            cnr = note_free(sub)
          } else {
            cnr = sub
          } 
          s_x += beat.sub_w
          return {
            x,
            cnr
          }
        })
        b_x += beat.w
        return b_res
      }) 
      m_x += measure.w
      return m_res
    }) 
  }

  constructor(readonly time_signature: TimeSignature) {}

  measure_beat_sub_pos(_measure: number, _beat: number, _sub: number) {
    let measure = this.measures[_measure - 1],
      beat = measure.beats[_beat]
    let pre_measures = this.measures.slice(0, _measure - 1),
      pre_beats = measure.beats.slice(0, _beat),
      pre_subs = beat.subs.slice(0, _sub)


    return pre_measures.map(_ => _.w).reduce(fsum, 0) +
      pre_beats.map(_ => _.w).reduce(fsum, 0) +
      pre_subs.map(_ => beat.sub_w / 2).reduce(fsum, 0)
  }

  add_cnr(_measure: number, _beat: number, _sub: number, notes: ChordNoteOrRest) {

    let measure = this.measures[_measure - 1]
    measure.add_cnr(_beat, _sub, notes)
  }

  add_measure() {
    let measure = new MeasureSheet(this)

    this.measures.push(measure)

    return measure
  }
}

