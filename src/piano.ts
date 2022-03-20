import { time_nb_note_value, time_note_value, make_note, is_note, note_pitch, note_duration, note_octave, note_accidental } from './music/types'
import { BeatMeasure, time_bm_duration, time_duration_bm } from './music/types'
import { pianokey_pitch_octave } from './music/piano'

import { note_uci } from './music/format/uci'


export class Playback {

  get sub_beat() {
    return this.bm % this.beat_quanti
  }

  get beat() {
    return Math.floor((this.bm % this.measure_quanti) / this.beat_quanti)
  }

  get measure() {

    return Math.floor(this.bm / this.measure_quanti) + 1
  }

  get beat_quanti() {
    return 8
  }

  get measure_quanti() {
    return this.nb_beats * this.beat_quanti
  }

  get nb_beats() {
    return time_nb_note_value(this.time_signature)
  }

  get note_value() {
    return time_note_value(this.time_signature)
  }

  constructor(readonly time_signature: TimeSignature) {}

  bm: BeatMeasure = 0

  increment() {
    this.bm++;
    return this
  }
}

export  type NbVoice = 1 | 2 | 3 | 4

export class Piano {

  keys: Map<BeatMeasure, Array<PianoKey>> = new Map()

  constructor(readonly voices: NbVoice) {}

  get all() {
    return [...this.keys]
  }

  zero(t: BeatMeasure) {
    return this.keys.get(t)
  }

  actives(time_signature: TimeSignature, t: BeatMeasure) {
    return this.all.flatMap(([t0, keys]) => {

      let _duration_bm = t - t0

      if (_duration_bm <= 0) {
        return []
      }

      let duration = time_bm_duration(time_signature, _duration_bm)

      let cnr = keys.map(key => {
        let po = pianokey_pitch_octave(key)
        return make_note(...po, duration)
      })

      if (cnr.length === 1) { cnr = cnr[0] }
      return [[t0, cnr]]
    })
  }


  push(key: PianoKey, t: BeatMeasure) {
    if (!this.keys.has(t)) {
      this.keys.set(t, [])
    }
    let res = this.keys.get(t)
    if (res.includes(key)) {
      this.keys.set(t, [])
      return
    }
    res.push(key)
  }

  release_previous(t: BeatMeasure) {
    let res = []
    for (let t0 of this.keys.keys()) {
      if (t0 < t) {
        res.push([t0, this.keys.get(t0)])
        this.keys.delete(t0)
      }
    }
    return res
  }
}

export class ComposeInTime {

  nrs: Array<ChordOrNoteOrRest> = []

  get nb_beats() {
    return time_nb_note_value(this.time_signature)
  }

  get note_value() {
    return time_note_value(this.time_signature)
  }

  get min_note_value() {
    return 8
  }

  get min_quanti() {
    return Math.max(1, Math.pow(2, this.note_value, - this.min_note_value) * 8)
  }

  get sub_quanties_for_note_values() {
    let res = []
    for (let i = this.note_value; i < this.min_note_value; i++) {
      res.push(Math.max(1, Math.pow(2, this.note_value - i) * 8))
    }
    return res
  }

  constructor(readonly time_signature: TimeSignature) {}


  /* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/log */ 
  quanti_note_value(quanti: BeatQuanti): Duration {
    return time_bm_duration(this.time_signature, quanti) 
  }

  quanti_in_subs(quanti: BeatQuanti) {
    return this.sub_quanties_for_note_values.reduce(([left, acc], sub_quanti) => {
      let res = Math.floor(left / sub_quanti)
      acc.push(res)
      return [left - res * sub_quanti, acc] as [BeatQuanti, Array<number>]
    }, [quanti, []] as [BeatQuanti, Array<number>])
  }

  scan_data(start_quanti: BeatQuanti, end_quanti: BeatQuanti): [number | undefined, number | undefined,  number, number] {

    let start_i,
    end_i
    let i_quanti = 0

    let off_start = 0, 
      off_end = 0

    for (let i = 0; i < this.nrs.length; i++) {

      let nr = this.nrs[i]
      let _is_note = is_note(nr)
      let _bm = time_duration_bm(this.time_signature, _is_note?note_duration(nr):nr)

      if (start_i === undefined) {

        if (i_quanti <= start_quanti && start_quanti < i_quanti+_bm) {
          off_start = start_quanti - i_quanti
          start_i = i
        }
      } 
      if (end_i === undefined) {
        if (i_quanti <= end_quanti && end_quanti <= i_quanti + _bm) {
          off_end = i_quanti + _bm - end_quanti
          end_i = i
          break
        }
      }

      i_quanti += _bm
    }

    return [start_i, end_i, off_start, off_end]
  }

  add_notes(t0: BeatMeasure, notes: Array<NoteOrRest>) {

    let note = notes[0]
    let _is_chord = notes.length > 1
    let _is_note = is_note(note)
    let _note_duration = note_duration(note)
    let _nb_quanti = time_duration_bm(this.time_signature, _note_duration)

    let [quantized_left, quantized_subs] = this.quanti_in_subs(_nb_quanti)

    _nb_quanti = _nb_quanti - quantized_left as BeatQuanti 

    let start_quanti = t0,
      end_quanti = start_quanti + _nb_quanti as BeatQuanti

    let [start_i, end_i, off_start, off_end] = this.scan_data(start_quanti, end_quanti)

    if (start_i !== undefined && end_i !== undefined) {
      let [left, subs] = this.quanti_in_subs(off_start as BeatQuanti)
      let [end_left, end_subs] = this.quanti_in_subs(off_end + left as BeatQuanti)

      let b_notes = subs
      .flatMap((_, i) => [...Array(_)]
               .map(() =>
                    this.quanti_note_value(this.sub_quanties_for_note_values[i]))
              )

      let e_notes = end_subs
      .flatMap((_, i) => [...Array(_)]
               .map(() =>
                      this.quanti_note_value(this.sub_quanties_for_note_values[i])))

      let i_notes = quantized_subs
      .flatMap((_, i) => [...Array(_)]
               .map(() => _is_note ? 
                    make_note(note_pitch(note), note_octave(note),
                              this.quanti_note_value(this.sub_quanties_for_note_values[i]), note_accidental(note)) :
                                this.quanti_note_value(this.sub_quanties_for_note_values[i])
                    ))

      let removed = this.nrs.splice(start_i, end_i - start_i + 1, ...b_notes, ...i_notes, ...e_notes)
      return true
    }

    return false
  }

  add_measure() {
    [...Array(this.nb_beats)]
    .forEach(_ => 
             this.nrs.push(this.note_value)) 
  }

}

function chord_note_rest_duration(note: ChordOrNoteOrRest) {
  if (Array.isArray(note)) {
    return note_duration(note[0])
  } else if (is_note(note)) {
    return note_duration(note)
  } else {
    return note
  }
}

export function composer_sheet_context_intime(composer: ComposeInTime, bm: BeatMeasure) {
  let { nb_beats, note_value, nrs } = composer

  let ctx: ComposeSheetContext = composer_context(composer)


  nrs.find(nr => {
    if (ctx.quanti + time_duration_bm(composer.time_signature, nr) > bm) {
      return true
    }

    composer_context_note_add(composer, ctx, nr)
    return false
  })

  return ctx
}

export function composer_sheet(composer: ComposeInTime) {
  let { nb_beats, note_value, nrs } = composer

  let ctx: ComposeSheetContext = composer_context(composer)

  return nrs.map(nr => {
    let res
    if (Array.isArray(nr)) {
      res = nr.map(_ => nr_free(_, ctx))
    } else {
      res = nr_free(nr, ctx)
    }
    composer_context_note_add(composer, ctx, nr)
    return res
  })
}

export function nr_free(nr: NoteOrRest, ctx: Context) {
  if (is_note(nr)) {
    let pitch = note_pitch(nr),
      octave = note_octave(nr),
      duration = note_duration(nr)

    return {
      ox: ctx.x,
      pitch,
      octave,
      duration
    } 

  } else {
    return {
      ox: ctx.x,
      rest: nr
    }
  }
}
