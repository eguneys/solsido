export type Music = {
  staff: Staff
}

export type Staff = {
  notes: Array<ClefTimeNoteOrChord>
}

export type Pitch = string
export type Octave = number
export type Duration = number
export type Text = string
export type Tie = string
export type Dot = string
export type Bar = string

export type Time = string
export type Clef = string

export type ClefTimeNoteOrChord = Clef | Time | Note | Chord | Bar

export type Note = {
  pitch: Pitch,
  octave: Octave,
  duration?: Duration,
  dot?: Dot,
  tie?: Tie,
  text?: Text
}

export type Chord = Array<Note>

export const ignores = []
export const ids = ['octave', 'pitch', 'clef', 'duration_number', 'dot', 'duration', 'text', 'word', 'accidental', 'tie', 'bar', 'dbar']


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


  let notes = staff.flatMap(_ => {
    if ("command" in _) {
      return [command(_)]
    } else if ("dbar" in _) {
      return _.dbar
    } else if ("bar" in _) {
      return _.bar
    } else if ("wPO" in _) {
      return wPO(_)
    } else if ("chord" in _) {
      return [_.chord.map(wPO)]
    }
    return []
  })

  return { notes }

  let clef = commands.find(_ => _[0].word === 'clef')
  if (clef) {
    clef = clef[1].word
  }

  let time = commands.find(_ => _[0].word === 'time')
  if (time) {
    time = time[1].word
  }
}

export function command(_: any) {
  let { command } = _

  return command.map(_ => _.word)
}

export function wPO(_: any) {
  let { wPO } = _

  if (wPO) {

    let _pitch = wPO.find(_ => "pitch" in _)
    let _accidental_octaves = wPO.find(_ => "accidentals_octave" in _)
    let _duration_ties = wPO.find(_ => "duration_ties" in _)

    let _octaves = _accidental_octaves?.accidentals_octave.find(_ => "octaves" in _)
    let _accidentals = _accidental_octaves?.accidentals_octave.filter(_ => "accidental" in _)

    let _text = _duration_ties?.duration_ties.find(_ => "text" in _)
    let _duration = _duration_ties?.duration_ties.find(_ => "duration" in _)

    let _tie = _duration_ties?.duration_ties.find(_ => "tie" in _)

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

        let _duration_number = duration?.find(_ => _.duration_number)?.duration_number,
          _duration_dot = duration?.find(_ => _.dot)?.dot

        let accidental = _accidentals?.map(_ => _.accidental).join('')
        let tie = _tie?.tie

        return {
          pitch,
          octave,
          duration: _duration_number,
          dot: _duration_dot,
          accidental,
          tie
        }
      }
    }
  }
}
