import { make_note, Duration } from './types'

export type Black = number
export type White = number

export type PianoKey = Black | White

export const nb_white = 5 * 7

export function index_black(idx: number): Black {
  return idx + 1 + nb_white + 1
}

export function index_white(idx: number): White {
  return idx + 1
}

export function black_index(b: Black): number {
  return b - nb_white - 2
}

export function white_index(w: White): number {
  return w - 1
}

export function is_black(_: Black | White): _ is Black {
  return _ > nb_white
}

export function pianokey_pitch_octave(key: PianoKey) {
  if (is_black(key)) {
    let idx = black_index(key)

    let octave = Math.floor(idx / 5) + 1,
      pitch = idx % 5 + 1

    if (pitch > 2) {
      pitch+= 1
    }

    octave += 2
    return [pitch, octave]
  } else {
    let idx = white_index(key)

    let octave = Math.floor(idx / 7) + 1
    let pitch = (idx % 7) + 1

    octave += 2

    return [pitch, octave]
  }
}
