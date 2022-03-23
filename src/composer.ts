import { time_note_value, time_nb_note_value } from './music/types'
import { chord_note_rest_duration } from './piano'

export type Sub = {
  on_note: ChordNoteOrRest,
  note_index: number,
  my_index: number
}

export class Composer {

  subs: Array<Sub> = []

  get note_subs() {
    return this.subs.filter(_ => _.note_index === _.my_index)
  }

  get notes() {

  }

  get nb_beats() {
    return time_nb_note_value(this.time_signature)
  }

  get note_value() {
    return time_note_value(this.time_signature)
  }

  get sub_note_value() {
    return this.note_value - Math.log(1/8) / Math.log(2)
  }

  get nb_subs_per_beat() {
    return this.note_length_in_subs(this.note_value)
  }

  constructor(readonly time_signature: TimeSignature) { }

  note_length_in_subs(cnr: ChordNoteOrRest) {
    let duration = chord_note_rest_duration(cnr)
    return Math.pow(2, this.note_value - duration) * 8
  }

  add_measure() {
    let on_note = this.note_value
    let from_index = this.subs.length
    this.subs = this.subs.concat([...Array(this.nb_beats).keys()].flatMap(i_beat => {
      let note_index = from_index + this.nb_subs_per_beat * i_beat 
      return [...Array(this.nb_subs_per_beat).keys()].map(i => ({
        on_note,
        note_index,
        my_index: note_index + i
      }))
    }))
  }

}
