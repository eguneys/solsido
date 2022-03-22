import { Note, note_pitch, note_octave, note_accidental } from '../music/types'

export type Synth = {
  amplitude: number,
  cutoff: number,
  cutoff_max: number,
  amp_adsr: Adsr,
  filter_adsr: Adsr
}

export type MidiNote = {
  synth: Synth,
  freq: number
}

export type Adsr = {
  a: number,
  d: number,
  s: number,
  r?: number
}

export function make_adsr(a: number, d: number, s: number, r?: number) {
  return { a, d, s, r }
}

/* C C# D D# E F F# G G# A A# B */
const pitch_to_freq_index = [1, 1.5, 2, 2.5, 3, 4, 4.5, 5, 5.5, 6, 6.5, 7]
/* https://github.com/jergason/notes-to-frequencies/blob/master/index.js */
/* http://techlib.com/reference/musical_note_frequencies.htm#:~:text=Starting%20at%20any%20note%20the,be%20positive%2C%20negative%20or%20zero. */
/* https://newt.phys.unsw.edu.au/jw/notes.html */
function note_freq(note: Note) {

  let octave = note_octave(note)
  let pitch = note_pitch(note)
  let accidental = note_accidental(note)

  if (accidental === 1) {
    pitch += 0.5
  }
  let n = pitch_to_freq_index.indexOf(pitch)

  n += octave * 12

  return 440 * Math.pow(2, (n - 57) / 12)
}

function ads(param: AudioParam, now: number, { a,d,s,r }: Adsr, start: number, max: number) {
  a /= 1000
  d /= 1000
  r /= 1000

  param.setValueAtTime(start, now)
  param.linearRampToValueAtTime(max, now + a)
  param.linearRampToValueAtTime(s, now + a + d)

  /* not needed ? */
  //param.setValueAtTime(s, now + a + d)
}

function r(param: AudioParam, now: number, { r }: Adsr, min: number) {
  r /= 1000
  param.cancelScheduledValues(now)
  param.linearRampToValueAtTime(min, now + (r || 0))
}

export class PlayerController {

  _context?: AudioContext

  get context(): AudioContext {
    if (!this._context) {
      this._context = new AudioContext()
    }
    return this._context
  }


  get currentTime(): number {
    return this.context.currentTime
  }

  _gen_id: number = 0
  get next_id(): number {
    return ++this._gen_id
  }

  players: Map<number, HasAudioAnalyser> = new Map()

  constructor(readonly synth: Synth) {
  }

  attack(note: Note, time: number = 0) {

    let { next_id, synth } = this

    this.players.set(next_id, new MidiPlayer(this.context)
                     ._set_data({
                       synth,
                       freq: note_freq(note)
                     }).attack(time))
    return next_id
  }

  release(id: number, time: number = 0) {
    let player = this.players.get(id)
    if (player) {
      player.release(time)
    }
    this.players.delete(id)
  }
}

abstract class HasAudioAnalyser {
  analyser?: AnalyserNode

  gain?: GainNode

  get maxFilterFreq(): number {
    return this.context.sampleRate / 2
  }

  constructor(readonly context: AudioContext) {}

  attack(time: number = this.context.currentTime) {
    let { context } = this

    this.gain = context.createGain()
    this.analyser = context.createAnalyser()

    this.gain.gain.setValueAtTime(1, time)
    this.gain!.connect(this.analyser)
    this.analyser.connect(context.destination)

    this._attack(time)
    return this
  }

  release(time: number = this.context.currentTime) {
    this._release(time)
    return this
  }


  abstract _attack(time: number): void
  abstract _release(time: number): void
}


export class MidiPlayer extends HasAudioAnalyser {

  data!: MidiNote

  osc1!: OscillatorNode
  osc2!: OscillatorNode
  envelope!: GainNode
  filter!: BiquadFilterNode

  _set_data(data: MidiNote) {
    this.data = data
    return this
  }

  _attack(now: number) {

    let { context, maxFilterFreq } = this
    let out_gain = this.gain!

    let { freq, synth } = this.data

    let { volume, cutoff, cutoff_max, amplitude, filter_adsr, amp_adsr } = synth

    let osc1 = new OscillatorNode(context, { type: 'sawtooth' })
    this.osc1 = osc1

    let osc2 = new OscillatorNode(context, { type: 'sawtooth' })
    this.osc2 = osc2


    let osc1_mix = new GainNode(context)
    osc1.connect(osc1_mix)
    let osc2_mix = new GainNode(context)
    osc2.connect(osc2_mix)

    osc1_mix.gain.setValueAtTime(0.5, now)
    osc2_mix.gain.setValueAtTime(0.5, now)

    osc2.detune.setValueAtTime(700, now)

    let filter = new BiquadFilterNode(context, { type: 'lowpass' })
    this.filter = filter
    osc1_mix.connect(filter)
    osc2_mix.connect(filter)

    out_gain.gain.setValueAtTime(volume, now)

    let envelope = new GainNode(context)
    this.envelope = envelope
    filter.connect(envelope)
    envelope.connect(out_gain)

    osc1.frequency.setValueAtTime(freq, now)
    osc2.frequency.setValueAtTime(freq, now)

    /* Syntorial */
    let _filter_adsr = { ...filter_adsr, s: 
      cutoff * maxFilterFreq * 0.4 + 
      filter_adsr.s * cutoff_max * maxFilterFreq * 0.6 }
    ads(filter.frequency,
         now,
         _filter_adsr,
         cutoff * maxFilterFreq * 0.4,
         cutoff * maxFilterFreq * 0.4 + cutoff_max * maxFilterFreq * 0.6)

    ads(envelope.gain,
         now,
         amp_adsr,
         0,
         amplitude * 0.5)

         osc1.start(now)
         osc2.start(now)
  }


  _release(now: number) {

    let { synth: { cutoff, amp_adsr, filter_adsr }  } = this.data

    let { a, d, r: _r } = amp_adsr

    a /= 1000
    d /= 1000
    _r /= 1000

    r(this.envelope.gain, now, amp_adsr, 0)
    r(this.filter.frequency,
      now,
      filter_adsr,
      cutoff * this.maxFilterFreq * 0.4)
    this.osc1.stop(now + a + d + _r)
    this.osc2.stop(now + a + d + _r)
  }
}
