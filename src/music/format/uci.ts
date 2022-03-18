import { is_note } from '../types'

export function note_uci(note: NoteOrRest) {
  if (is_note(note)) {
    return `g'1`
  } else {
    return `r1`
  }
}
