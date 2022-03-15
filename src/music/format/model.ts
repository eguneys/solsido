export type Music = {
  staff: Staff
}

export type Staff = {
  clef: Clef,
  notes: Array<NoteOrChord>
}

export type Pitch = string
export type Octave = number
export type Duration = number
export type Text = string

export type NoteOrChord = Note | Chord

export type Note = {
  pitch: Pitch,
  octave: Octave,
  duration?: Duration,
  text?: Text
}

export type Chord = Array<Note>

export const ignores = []
export const ids = ['octave', 'pitch', 'clef', 'duration', 'text', 'word']


export function model(ref: any): Music | undefined {
  let staff = ref.map(_staff)[0]
  if (staff) {
    return {
      staff
    }
  }
}

export function _staff(_: any) {
  let { staff } = _
  let commands = staff.filter(_ => "command" in _)
  .map(_ => _.command)

  let clef = commands.find(_ => _[0].word === 'clef')
  if (clef) {
    clef = clef[1].word
  }

  let notes = staff.filter(_ => "wPO" in _ || "chord" in _)

  notes = notes.map(_ => {
    if ("wPO" in _) {
      return _wPO(_)
    } else if ("chord" in _) {
      return _.chord.map(_wPO)
    }
  })

  return { clef, notes }
}

export function _wPO(_: any) {
  let { wPO } = _

  if (wPO) {

    let _pitch = wPO.find(_ => "pitch" in _)
    let _octaves = wPO.find(_ => "octaves" in _)
    let _text = wPO.find(_ => "text" in _)
    let _duration = wPO.find(_ => "duration" in _)

    if (_pitch) {
      let pitch = _pitch.pitch,
        octave = _octaves?.octaves.length || 0

      if (_text) {
        let text = _text.text.map(_ => _.word).join('')
        return {
          pitch,
          octave,
          text
        }
      } else {
        let duration = _duration?.duration

        return {
          pitch,
          octave,
          duration
        }
      }
    }
  }
}
