import { is_note, note_pitch, note_octave, note_duration } from '../types'

let pitch_ucis = ['', 'c', 'd', 'e', 'f', 'g', 'a', 'b']
let octave_ucis = ['', ',,,', ',,', ',', '', '\'', '\'\'', '\'\'\'']
let duration_ucis = ['', '0', '1', '2', '4', '8', '16', '32', '64']
export function note_uci(note: Note) {
  let pitch = note_pitch(note),
    octave = note_octave(note),
    duration = note_duration(note)

  return [pitch_ucis[pitch], 
    octave_ucis[octave], 
    duration_ucis[duration]].join('')
}

export function cnr_uci(note: ChordNoteRest) {
  if (Array.isArray(note)) {
    return `<${note.map(note_uci)}>`
  } else if (is_note(note)) {
    return note_uci(note)
  } else {
    return `r${duration_ucis[note]}`
  }
}
