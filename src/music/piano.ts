export type Black = number
export type White = number

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
