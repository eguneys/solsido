import { time_nb_note_value, time_note_value, make_note, is_note, note_pitch, note_duration, note_octave } from './music/types'
import { BeatMeasure, time_bm_duration, duration_bm } from './music/types'

import { note_uci } from './music/format/uci'


export class Playback {

  bm: BeatMeasure = 0

  increment() {
    this.bm++;
    return this
  }
}

export class Piano {

  keys: Map<PianoKey, BeatMeasure> = new Map()

  get actives() {
    return this.keys.keys()
  }

  active_notes(now: BeatMeasure) {
    [...this.keys.keys()].map(key => {

    })

  }

  toggle(key: PianoKey, at: BeatMeasure) {
    if (!this.keys.has(key)) {
      this.keys.set(key, at)
    } else {
      this.keys.delete(key, at)
    }
    return this
  }

  release(key: PianoKey, at: BeatMeasure) {
    let _begin = this.keys.get(key)
    if (_begin) {
      this.keys.delete(key)
      return at - _begin
    }
    return this
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
      let _bm = nr_bm(nr, this.time_signature)

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

  add_note(bm: BeatMeasure, nb_quanti: BeatQuanti, po?: [Pitch, Octave, Accidental|undefined]) {

    if (nb_quanti === 0) {
      return
    }

    let [quantized_left, quantized_subs] = this.quanti_in_subs(nb_quanti)

    nb_quanti = nb_quanti - quantized_left as BeatQuanti
    let note_duration = this.quanti_note_value(nb_quanti)

    let start_quanti = bm,
      end_quanti = start_quanti + nb_quanti as BeatQuanti

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
               .map(() => po?
                    make_note(po[0], po[1], 
                              this.quanti_note_value(this.sub_quanties_for_note_values[i]), po[2]) :
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

export type ComposeSheetContext = {
  x: number,
  quanti: BeatQuanti
}

function composer_context(composer: ComposeInTime) {
  return { x: 0, quanti: 0 }
}

function composer_context_note_add(composer: ComposeInTime, ctx: ComposeSheetContext, note: ChordOrNoteOrRest) {
  ctx.x += 1
  
  ctx.quanti += duration_bm(chord_note_rest_duration(note))
}

export function composer_sheet_context_intime(composer: ComposeInTime, bm: BeatMeasure) {
  let { nb_beats, note_value, nrs } = composer

  let ctx: ComposeSheetContext = composer_context(composer)


  nrs.find(nr => {
    if (ctx.quanti + duration_bm(nr) > bm) {
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

function nr_free(nr: NoteOrRest, ctx: Context) {
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
