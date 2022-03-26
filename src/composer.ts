import { is_note, make_time_signature, time_note_value, time_nb_note_value } from './music/types'
import { chord_note_rest_duration } from './piano'
import { is_rest, make_note } from './music/types'
import read_fen from './music/format/read'

import { note_free } from './sheet'

function chord_note_rest_free(note: ChordNoteOrRest) {
  if (Array.isArray(note)) {
    return note.map(note_free)
  } else if (is_note(note)) {
    return note_free(note)
  } else {
    return note
  }
}

export type ChordGroup = Array<ChordNoteRest>

export type SheetVis = {
  clef?: Clef
  time?: TimeSignature,
  notes: Array<ChordGroup>
}

const model_nb_beats = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
function model_to_nb_beats(_nb_beats: string) {
  return model_nb_beats.indexOf(_nb_beats)
}

// 1 2 4 8 16
// d w h q e s t x
// 1 2 3 4 5 6 7 8
// 2 3 4 5 6
const model_note_values = ['0', '0', '1', '2', '4', '8', '16', '32', '64']
function model_to_note_value(_note_value: string) {
  return model_note_values.indexOf(_note_value)
}

const model_clefs = ['treble', 'bass']
function model_clef(_clef: string) {
  let clef = model_clefs.indexOf(_clef) + 1
  if (clef > 0) {
    return clef
  }
}

function model_time(_time: string) {
  let [_nb_beats, _note_value] = _time.split('/')
  return make_time_signature(model_to_nb_beats(_nb_beats), 
                             model_to_note_value(_note_value))
}



let model_pitches = ['c', 'd', 'e', 'f', 'g', 'a', 'b']
let model_octaves = [3, 4, 5, 6]
let model_durations = [undefined, undefined, '1', '2', '4', '8', '16', '32']
let model_accidentals = ['is', 'es', 'isis', 'eses']

function model_chord(model: ClefTimeNoteOrChord) {
  let { pitch, octave, dot, duration, text, accidental, tie } = model

  let _pitch = model_pitches.indexOf(pitch) + 1
  let _octave = model_octaves[octave] 

  let _duration = model_durations.indexOf(duration)
  let _accidental = (model_accidentals.indexOf(accidental) + 1) || undefined


  if (text) {
    return {
      pitch: _pitch,
      octave: _octave,
      text
    }
  } else if (_pitch > 0) {
    if (!!_octave) {
      return make_note(_pitch, _octave, _accidental, _duration)
    }
  } else {
    return _duration
  }
}

export function fen_composer(fen: Fen) {

  let { staffs, grandstaff } = read_fen(fen)

  if (grandstaff) {

  } else if (staffs) {
    return staffs.map(staff => {
      let { notes: _notes } = staff

      let clef,
      time,
      notes = []

      _notes.map(model => {
        if (Array.isArray(model)) {
          let [command, rest] = model

          if (command === 'clef') {
            clef = model_clef(rest)
          } else if (command === 'time') {
            time = time || model_time(rest)
            notes.push({
              time: model_time(rest)
            })
          } else {
            notes.push(model.map(model_chord))
          }
        } else if (model === '|') {
          notes.push(model)
        } else if (model === '||') {
          notes.push(model)
        } else {
          notes.push(model_chord(model))
        }
      })

      if (!time) {
        let res = new FreeComposer()

        notes.forEach(note => {
          res.add_cnr(note)
        })

        return {
          clef,
          frees: grouped_no_time(res.notes)
        }
      } else {
        let res = new ComposerMoreTimes()
        let m = 0
        let bm = 0
        notes.forEach(note => {
          if (typeof note === 'string') {
            if (note === '||') {
              bm = (m + 1) * res.beats_per_measure * 8
            }
          } else if (Array.isArray(note) || typeof note === 'number') {
            res.add_cnr(bm, note)
            let duration = res.last.note_length_in_subs(note)
            bm += duration
          } else {
            if (note.time) {
              res.add_time(note.time)
            }
          }
        })

        return {
          clef,
          time,
          notes: grouped_frees_with_times(res.notes)
        }
      }
    })
  }

}

export function grouped_frees_with_times(composer_notes: any) {
  let last_time_signature
  return composer_notes.map(([time_signature, notes]) => {
    return [
      last_time_signature === time_signature ? undefined : (last_time_signature = time_signature),
        grouped_free(time_signature, notes)
    ]
  })
}


export function grouped_no_time(notes: Array<ChordNoteRest>) {
  let group_x = 0
  return notes.map(note => {
    let x = group_x,
      w = 0.75
    let res = {
      x,
      w,
      group: [note]
    }
    group_x += w
    return res
  })
}

let dur_lengths = [0, 4, 2, 1, 1, 1, 1, 1, 1]
export function group_w(group: Array<ChordNoteRest>) {
  let duration = chord_note_rest_duration(group[0])

  return group.length * dur_lengths[duration]
}

export function grouped_free(time_signature: TimeSignature, notes: Array<Array<ChordNoteRest>>) { 
  let group_x = 0
  return notes.map(group => {
    let x = group_x
    let w = group_w(group)
    let res = {
      x,
      w,
      group: group.map(chord_note_rest_free)
    }
    group_x += w
    return res
  })
}


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


export class ComposerMoreTimes {

  data: Array<Composer> = []


  get notes() {
    return this.data.map(_ => [_.time_signature, _.notes])
  }


  get last() {
    return this.data[this.data.length - 1]
  }

  seek_composer(bm: BeatMeasure) {
    let seek = 0
    let res = this.data.find(_ => {
      if (seek + _.nb_subs >= bm) {
        return true
      }
      seek += _.nb_subs
    })
    return [res, seek]
  }

  add_cnr(bm: BeatMeasure, on_note: ChordNoteOrRest) {

    let [composer, bm_start] = this.seek_composer(bm)
    if (composer) {
      composer.add_cnr(bm - bm_start, on_note) 
    } else {
      this.add_measure()
      this.add_cnr(bm, on_note)
    }
  }

  add_time(time_signature: TimeSignature) {
    this.data.push(new Composer(time_signature))
  }

  add_measure(time_signature?: TimeSignature) {
    if (!this.last || this.last.time_signature !== time_signature) {
      this.data.push(new Composer(time_signature || this.last.time_signature))
    }

    this.last.add_measure()
  }

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

  get nb_subs() {
    return this.data
    .reduce((acc, _) =>
            this.note_length_in_subs(_) + acc, 0)
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
    for (let i = 0; i < this.data.length; i++) {
      let duration = this.note_length_in_subs(this.data[i])

      if ((start_i === undefined) && (c_bm <= bm) && (bm < c_bm + duration)) {
        start_i = i
        off_start = bm - c_bm


        let o_bm = off_start

        if ((c_bm + o_bm <= bm + width) && (bm + width <= c_bm + duration)) {
          end_i = i
          off_end = c_bm + duration - (bm + width)
          break
        }
      } else if (start_i !== undefined) {
        //console.log(this.dots, c_bm, bm+width, c_bm + duration, c_bm, bm, width)
        if ((c_bm <= bm + width) && (bm + width <= c_bm + duration)) {
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

      if (res === 0) {
        return []
      }
      return [...Array(res)].map(_ => note)
    })

  }

  add_cnr(bm: BeatMeasure, on_note: ChordNoteOrRest) {
    let bm_duration = this.note_length_in_subs(on_note)

    let res = this.scan_notes(bm, bm_duration)

    if (res) {

      let [start_i, off_start, end_i, off_end] = res

      if (start_i === undefined || end_i === undefined) {
        this.add_measure()
        this.add_cnr(bm, on_note)
        return
      }

      //console.log(this.dots, bm, bm_duration, start_i, off_start, end_i, off_end)
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


  composer.add_cnr(7, 3)
  is(composer.dots, '5---6-73---------------74-------')

  composer.add_cnr(16, 4)
  is(composer.dots, '5---6-74-------74-------4-------')

  //composer.add_cnr(15, 4)
  //is(composer.dots, '5---6-74-------4-------74-------')

  //composer.add_cnr(6, 4.5)
  //is(composer.dots, '5---6-4-----------6-5---4-------')
}

// test()



export class FreeComposer {

  data: Array<ChordNoteOrRest> = []

  get notes() {
    return this.data
  }

  add_cnr(cnr: ChordNoteOrRest) {
    this.data.push(cnr)
  }
}
