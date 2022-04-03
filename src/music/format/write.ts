import { is_note, note_pitch, note_octave, note_duration, note_accidental } from '../types'
import { time_note_value, time_nb_note_value } from '../types'


export function time_fen(time: TimeSignature) {
  return `/time ${time_nb_note_value(time)}/${duration_ucis[time_note_value(time)]}`
}

export function cnr_fen(cnr: ChordNoteOrRest) {
  if (Array.isArray(cnr)) {
    return `<${cnr.map(note_text_fen)}>`
  } else if (typeof cnr === 'object' && !!cnr.text) {
    return note_text_fen(cnr)
  } else if (is_note(cnr)) {
    return note_fen(cnr)
  } else {
    return rest_fen(cnr)
  }
}

export function note_text_fen(cnr: Note | HasText) {
  if (typeof cnr === 'object' && !!cnr.text) {
    return `"${cnr.text}"`
  } else {
    return note_fen(cnr)
  }
}

export function rest_fen(rest: Rest) {
  return `r${duration_ucis[rest]}`
}

const pitch_ucis = ['', 'c', 'd', 'e', 'f', 'g', 'a', 'b']
const octave_ucis = [',,,', ',,', ',', '', '\'', '\'\'', '\'\'\'', '\'\'\'\'']
const duration_ucis = ['', '', '1', '2', '4', '8', '16', '32', '64', '128']
const accident_ucis = ['', 'is', 'es', 'isis', 'eses']
export function note_fen(note: Note) {
  let pitch = note_pitch(note),
    octave = note_octave(note),
    duration = note_duration(note),
    accident = note_accidental(note)


  return [pitch_ucis[pitch], octave_ucis[octave], duration_ucis[duration], accident_ucis[accident]].join('')
}
