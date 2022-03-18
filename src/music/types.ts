export type Pitch = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type Octave = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type Duration = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8


export type Accidental = 1 | 2 | 3 | 4 | 5

export type Note = number

export type Clef = 1 | 2

export type Rest = Duration

export type NbNoteValuePerMeasure = 2 | 3 | 4 | 6 | 9 | 12
export type NoteValue = Duration

export type TimeSignature = number

export type Tempo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8


export type BeatMeasure = number
export type BeatQuanti = BeatMeasure


const pitch_mask =      0x0000000f
const octave_mask =     0x000000f0
const duration_mask =   0x00000f00
const accidental_mask = 0x0000f000

const note_1 = make_note(1, 1, 1)
const note_n = make_note(7, 7, 8, 2)

export function is_note(n: number): n is Note {
    return n >= note_1 && n <= note_n
}

export function is_rest(n: number): n is Rest {
    return n >= 1 && n <= 8
}

export function make_note(pitch: Pitch, octave: Octave, duration: Duration, accidental?: Accidental) {
    return pitch | (octave << 4) | (duration << 8) | ((accidental || 0) << 12)
}

export function note_pitch(note: Note): Pitch {
    return (note & pitch_mask) as Pitch
}

export function note_octave(note: Note): Octave {
    return (note & octave_mask) >> 4 as Octave
}

export function note_duration(note: Note): Duration {
    return (note & duration_mask) >> 8 as Duration
}

export function note_accidental(note: Note): Accidental | undefined {
    return (note & accidental_mask) >> 12 as Accidental
}



export function make_time_signature(nb_note_value: NbNoteValuePerMeasure, note_value: NoteValue) {

    return nb_note_value * 16 + note_value
}

export function time_nb_note_value(signature: TimeSignature): NbNoteValuePerMeasure {
    return Math.floor(signature / 16) as NbNoteValuePerMeasure
}

export function time_note_value(signature: TimeSignature): NoteValue {
    return signature % 16 as NoteValue
}

export function tempo_tempo(tempo: Tempo) {
    return tempos[tempo - 1]
}

export function is_tempo(tempo: number): tempo is Tempo {
    return tempo >= 1 && tempo <= 8
}

