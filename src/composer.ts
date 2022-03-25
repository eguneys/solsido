import { make_time_signature, time_note_value, time_nb_note_value } from './music/types'
import { chord_note_rest_duration } from './piano'
import { is_rest } from './music/types'

function replaceAt(self: string, index: number, replacement: string) {
  return self.substr(0, index) + replacement + self.substr(index + replacement.length);
}


function is_group(group: Array<ChordNoteOrRest>, cnr: ChordNoteOrRest) {
  if (group.length === 0) {
    return true
  }

  if (is_rest(group[0]) || is_rest(cnr)) {
    return false
  }

  let g_duration = chord_note_rest_duration(group[0]),
    c_duration = chord_note_rest_duration(cnr)

  if (g_duration === c_duration) {
    return true
  }
  return false
}

/*
  // time signature 4/4
  // method call  // logs
  init()          // 4.......4......4.......
  add(0, 2)       // 2...2...4......4.......
  add(4, 8)       // 2...8..............2...
  add(6, 6)       // 2...116..........112...
*/

export class Composer {


  data: Array<ChordNoteOrRest>

  get dots() {

    let all = [...Array(this.beats_per_measure)].flatMap(beat => [...Array(this.note_length_in_subs(this.note_value))].map(_ => '-')).join('')

    let bm = 0
    this.data.forEach(cnr => {
      let duration = chord_note_rest_duration(cnr)
      let bm_duration = this.note_length_in_subs(cnr)

      all = replaceAt(all, bm, `${duration}`)
      bm += bm_duration
    })

    return all
  }

  /*

  1 m. 1 2 3 4 
       1 2 3 4
       1 2 3 4
       1 2 3 4

  2 m. ...
  3 m. 1 2 3 4
       1 2 3 4 ...
  5 m. 1
       1 2 3 4
       1
       1 2

  6 m. 1
       1 2 3
       1 2
       1 2 3
  7 m. 1 2 3
       1
  8 m. 1 2 3
       1 2 3
       1

  */
  /*
   
   [{ 1 2 3 4 },
   { 1 2 3 4 },
   { 1 2 3 4 },
   { 1 2 3 4 }],
   [{ 1 2 3 },
    { 1 }]


   1 1 2 2 3 3 4 4 1 2 3 4 1 2 3 4 w w w w 1 2 3 4 1 2 3 4
   4   4   4   4   4 4 4 4 4 4 4 4 1       4 4 4 4 4 4 4 4


   */
  get notes() {

    let groups = []
    let group = []

    for (let i = 0; i < this.data.length; i++) {
      let cnr = this.data[i]

      if (is_group(group, cnr)) {
        group.push(cnr)
      } else {
        groups.push(group)
        group = [cnr]
      }
    }

    if (group.length > 0) {
      groups.push(group)
    }

    return groups
  }

  get beats_per_measure() {
    return time_nb_note_value(this.time_signature)
  }

  get note_value() {
    return time_note_value(this.time_signature)
  }

  get sub_note_values() {
    return [...Array(4).keys()].map(_ => this.note_value + _)
  }

  constructor(readonly time_signature: TimeSignature) { this.data = [] }


  note_length_in_subs(cnr: ChordNoteOrRest) {
    let duration = chord_note_rest_duration(cnr)
    return Math.pow(2, this.note_value - duration) * 8
  }

  scan_notes(bm: BeatMeasure, width: BeatMeasure) {
    let start_i,
    end_i,
    off_start,
    off_end

    let c_bm = 0
    let o_bm = 0
    for (let i = 0; i < this.data.length; i++) {
      let duration = this.note_length_in_subs(this.data[i])

      if ((start_i === undefined) && (c_bm <= bm) && (bm < c_bm + duration)) {
        start_i = i
        off_start = bm - c_bm
        o_bm = off_start
      }
      if (start_i !== undefined) {
        //console.log(this.dots, c_bm + o_bm, bm+width, c_bm + duration, c_bm, o_bm, bm, width)
        if ((c_bm + o_bm <= bm + width) && (bm + width < c_bm + duration)) {
          end_i = i
          off_end = c_bm + duration - (bm + width)
          break
        }
      }
      c_bm += duration
    }
    return [start_i, off_start, end_i, off_end]
  }

  subs_to_fill(subs: BeatMeasure) {
    return this.sub_note_values.flatMap(note => {
      let n_bm = this.note_length_in_subs(note)
      let res = Math.floor(subs / n_bm)
      subs -= res * n_bm

      return [...Array(res)].map(_ => note)
    })

  }

  add_cnr(bm: BeatMeasure, on_note: ChordNoteOrRest) {
    let bm_duration = this.note_length_in_subs(on_note)

    let res = this.scan_notes(bm, bm_duration)

    if (res) {

      let [start_i, off_start, end_i, off_end] = res

      if (start_i === undefined) {
        return
      }

      // console.log(this.dots, bm, bm_duration, start_i, off_start, end_i, off_end)
      let e_notes = this.subs_to_fill(off_end)
      let a_notes = this.subs_to_fill(off_start)

      this.data.splice(start_i, end_i - start_i + 1, ...a_notes, on_note, ...e_notes)

    }
  }

  add_measure() {
    this.data = [...this.data, ...[...Array(this.beats_per_measure)].map(_ => this.note_value)]
  }

}


function test() {

  function is(a, b) {
    if (a === b) {
      console.log('ok')
    } else {
      console.error(a, '!==\n', b)
    }
  }
  let w = 2,
    h = 3,
    q = 4,
    e = 5

  let composer = new Composer(make_time_signature(4, q))
  is(composer.dots, '--------------------------------')

  composer.add_measure()
  is(composer.dots, '4-------4-------4-------4-------')


  composer.add_cnr(0, e)
  is(composer.dots, '5---5---4-------4-------4-------')


  composer.add_cnr(4, h)
  is(composer.dots, '5---3---------------5---4-------')

  composer.add_cnr(6, 4)
  is(composer.dots, '5---6-4-------5---6-5---4-------')


  composer.add_cnr(7, 3)
  is(composer.dots, '5---6-73---------------74-------')

  //composer.add_cnr(6, 4.5)
  //is(composer.dots, '5---6-4-----------6-5---4-------')
}

//test()
