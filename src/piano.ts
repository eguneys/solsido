import { time_nb_note_value, time_note_value, make_note } from './music/types'
import { note_uci } from './music/format/uci'

export class Playback {

  bm: BeatMeasure = 0

  increment() {
    this.bm++;
    return this
  }
}

export class Piano {

  keys: Map<PianoKey, Timestamp> = new Map()

  get actives() {
    return this.keys.keys()
  }

  toggle(key: PianoKey, at: Timestamp) {
    if (!this.keys.has(key)) {
      this.keys.set(key, at)
    } else {
      this.keys.delete(key, at)
    }
    return this
  }

  release(key: PianoKey, at: Timestamp) {
    let _begin = this.keys.get(key)
    if (_begin) {
      this.keys.delete(key)
      return at - _begin
    }
    return this
  }
}

export class ComposeInTime {

  nrs: Array<NoteOrRest> = []

  get fen() {

    let notes = this.nrs.map(note_uci).join(' ')

    return `{ 
    /clef treble
    /time 2/2
    ${notes}
  }`

  } 

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


  quanti_note_value(quanti: BeatQuanti): Duration {
    return this.note_value - Math.log(quanti / 8) / Math.log(2) as Duration
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
