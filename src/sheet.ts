import { time_note_value, time_nb_note_value } from './music/types'
import { is_note, note_pitch, note_octave, note_duration, note_accidental } from './music/types'
import { cnr_uci } from './music/format/uci'
import { chord_note_rest_duration } from './piano'

const fsum = (a, b) => a + b

export const measure_bar = () => {
  return '|'
}

const sub_divisions = [1, 8, 4, 8, 2, 8, 8, 8, 8]

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


const beat_widths = [0, 1, 1.5, 3, 2, 5, 6, 7, 3]

export class BeatSheet {
  subs: Array<ChordNoteOrRest>

  get pretty() {
    return this.subs.map(_ => _ === 0 ? '-' : cnr_uci(_)).join(' ')
  }

  get clone() {
    let res = new BeatSheet(this.measure)
    res.subs = this.subs.slice(0)
    return res
  }

  get w() {
     return beat_widths[this.division]
  }

  // 1 2 4 8
  // 1 2 4 8
  get sub_w() {
    return this.w / this.division
  }

  get division() {
    return this.subs.filter(_ => _ !== 0).length
  }

  get time_signature() {
    return this.measure.time_signature
  }

  get note_value() {
    return time_note_value(this.time_signature)
  }

  get sub_note_value() {
    return this.note_value - Math.log(1/8) / Math.log(2)
  }

  constructor(readonly measure: MeasureSheet) {
    this.subs = [this.note_value]
  }

  note_length_in_subs(cnr: ChordNoteOrRest) {
    let duration = chord_note_rest_duration(cnr)
    return Math.pow(2, this.note_value - duration) * 8
  }

  sub_length_in_subs(i: number) {
    return this.note_length_in_subs(this.subs[i])
  }

  pre_sub_i(_sub: number) {
    for (let i = _sub; i >= 0; i--) {
      if (this.subs[i]) {
        return i
      }
    }
    // shouldnt come here
    return -1
  }

  _remove_sub(_sub: number) {
    let duration = this.sub_length_in_subs(_sub)

    for (let i = 0; i < duration; i++) {
      this.subs[_sub + i] = this.sub_note_value
    }
  }

  _add_sub(_sub: number, cnr: ChordNoteOrRest) {
    let duration = this.note_length_in_subs(cnr)

    for (let i = _sub; i < _sub + duration; i++) {
      this.subs[i] = 0
    }

    this.subs[_sub] = cnr
  }

  add_cnr(_sub: number, cnr: ChordNoteOrRest) {
    let duration = chord_note_rest_duration(cnr)

    let division = sub_divisions[_sub]

    if (this.division < division) {
      let old_subs = this.subs
      this.subs = Array(division)


      let factor = this.subs.length / old_subs.length
      old_subs.forEach((cnr, i) => this.subs[i * factor] = cnr)
    }

    let pre_i = this.pre_sub_i(_sub)
    let pre_duration = this.sub_length_in_subs(pre_i)

    if (_sub < pre_i + pre_duration) {
      this._remove_sub(pre_i)
    }

    this._add_sub(_sub, cnr)

  }
}

export class MeasureSheet {

  beats: Array<BeatSheet>

  get pretty() {
    return this.beats.map(_ => _.pretty).join('  ')
  }

  get clone() {
    let res = new MeasureSheet(this.sheet)
    res.beats = this.beats.map(_ => _.clone)
    return res
  }

  get w() {
    return this.beats.map(_ => _.w).reduce(fsum)
  }

  get time_signature() {
    return this.sheet.time_signature
  }

  get nb_beats() {
    return time_nb_note_value(this.time_signature)
  }

  constructor(readonly sheet: ComposeSheet) {
    let nb_beats = time_nb_note_value(this.time_signature)
    this.beats = [...Array(nb_beats)].map(_ => new BeatSheet(this))
  }


  dup_beat(_beat: number) {
    return this.add_beat(_beat, this.beats[_beat].clone)
  }

  add_beat(_beat: number, beat: BeatSheet) {
    this.beats.splice(_beat+1, 0, beat)


    return this.beats.splice(this.nb_beats)
  }


  add_cnr(_beat: number, _sub: number, cnr: ChordNoteOrRest) {
    let beat = this.beats[_beat]
    beat.add_cnr(_sub, cnr)
  }
}

export class ComposeSheet {

  measures: Array<MeasureSheet> = []

  get pretty() {
    return 'S' + this.measures.map((_, i) => `${i+1}m. ${_.pretty}`).join('|')
  }

  get w() {
    return this.measures.map(_ => _.w).reduce(fsum)
  }

  get bars() {
    let m_x = 0

    return this.measures.flatMap(measure => {
      m_x += measure.w

      let x = m_x
      let bar = measure_bar()

      return {
        x,
        bar
      }
    })

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
          if (sub === 0) {
            return 0
          } else if (Array.isArray(sub)) {
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

  dup_beat(_measure: number, _beat: number) {
    let overflow = this.measures[_measure].dup_beat(_beat)
  }

  dup_measure(_measure: number) {
    this.measures.splice(_measure+1, 0, this.measures[_measure].clone)
  }

  add_beat(_measure: number, _beat: number, beat: BeatSheet) {
    let overflow = this.measures[_measure].add_beat(beat)
  }

  measure_beat_sub_pos(_measure: number, _beat: number, _sub: number) {
    let measure = this.measures[_measure],
      beat = measure.beats[_beat]
    let pre_measures = this.measures.slice(0, _measure),
      pre_beats = measure.beats.slice(0, _beat),
      _pre_subs = beat.subs.slice(0, _sub)

    let pre_subs = _pre_subs.slice(0, -1),
      on_sub = _pre_subs.slice(-1)

    return pre_measures.map(_ => _.w).reduce(fsum, 0) +
      pre_beats.map(_ => _.w).reduce(fsum, 0) +
      pre_subs.filter(_ => _ !== 0).map(_ => beat.sub_w).reduce(fsum, 0) +
      on_sub.filter(_ => _ !== 0).map(_ => beat.sub_w * 0.25).reduce(fsum, 0)
  }

  add_cnr(_measure: number, _beat: number, _sub: number, notes: ChordNoteOrRest) {

    let measure = this.measures[_measure]
    measure.add_cnr(_beat, _sub, notes)
  }

  add_measure() {
    let measure = new MeasureSheet(this)

    this.measures.push(measure)

    return measure
  }
}

