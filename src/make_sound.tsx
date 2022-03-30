
import { onCleanup, createEffect, createSignal, createContext, useContext } from 'solid-js'
import { useApp } from './loop'
import { createEnvelope, Envelope, Knob, Group } from './sound'
import { PianoPlay } from './sound'

import { make_adsr, PlayerController } from './audio/player'
import { Zoom, PianoKeys } from './music'
import { make_note_po } from './music/types'

import { Piano as OPiano } from './piano'

import { pianokey_pitch_octave } from './music/piano'
import { btn_pitches_all, keys_by_button, btn_pianokey } from './buttons'

const SoundContext = createContext()

const useSound = () => { return useContext(SoundContext) }

const SoundProvider = (props) => {

  let synth = {
    volume: 0.3,
    amplitude: 0.5,
    cutoff: 0.7,
    cutoff_max: 0.0,
    amp_adsr: make_adsr(0, 0, 1, 0),
    filter_adsr: make_adsr(0, 0, 0.5, 0)
  }

  let amp_envelope = createEnvelope(synth.amp_adsr, make_adsr(
    [0, 2000, 70],
    [0, 2000, 70], 
    [0, 1, 0.1], 
    [0, 2000, 70]))

  let _amp = createSignal(synth.amplitude)


  let filter_envelope = createEnvelope(synth.filter_adsr, make_adsr(
    [0, 2000, 70],
    [0, 2000, 70], 
    [0, 1, 0.5], 
    [0, 2000, 70]))


  let _cutoff = createSignal(synth.cutoff)
  let _cutoff_max = createSignal(synth.cutoff_max)
  let _volume = createSignal(synth.volume)

  createEffect(() => {
    synth.amplitude = parseFloat(_amp[0]())
  })

  createEffect(() => {
    synth.cutoff = parseFloat(_cutoff[0]())
  })

  createEffect(() => {
    synth.cutoff_max = parseFloat(_cutoff_max[0]())
  })

  createEffect(() => {
    synth.volume = parseFloat(_volume[0]())
  })


  let player = new PlayerController(synth)

  let [piano, setPiano] = createSignal(new OPiano(), { equals: false })

  const press = (key: PianoKey) => {
    setPiano(piano => {
      piano.push(key, 0)
      return piano
    })
  }

  const release = (key: PianoKey) => {
    setPiano(piano => {
      piano.release(key)
      return piano
    })
  }


  const store = [
    [amp_envelope, _amp, filter_envelope, _cutoff, _cutoff_max, _volume],
    [piano, player], {
      press,
      release
    }
  ]

  return (<SoundContext.Provider value={store}>
    {props.children}
    </SoundContext.Provider>)
}


export const Sound = () => {
  return (<div class='make-sound'>
    <Knobs/>
    <ZoomedPiano/>
  </div>)
}

export const ZoomedPiano = () => {

  let [input] = useApp()

  let [[amp_envelope, amp],
    [piano, player], {
      press,
      release
    }] = useSound()

  let keys0 = [],
    keys

  let key_instrument_map = new Map<PianoKey, number>()
  createEffect(() => {
    keys = piano().all_keys.flat()
    
    let added = keys.filter(_ => !keys0.includes(_))
    let removed = keys0.filter(_ => !keys.includes(_))

    added.forEach(key => {
      let po = pianokey_pitch_octave(key)
      let i = player.attack(make_note_po(po, 2), player.currentTime)
      key_instrument_map.set(key, i)
    })
    removed.forEach(key => {
      let i = key_instrument_map.get(key)
      player.release(i, player.currentTime)
      key_instrument_map.delete(key)
    })

    keys0 = keys
  })

  onCleanup(() => {
    keys.forEach(key => {
      let i = key_instrument_map.get(key)
      player.release(i, player.currentTime)
      key_instrument_map.delete(key)
    })
  })

  createEffect(() => {
    let _input = input()


    btn_pitches_all.forEach(button=> {
      let x = _input.btn(button),
        x0 = _input.btn0(button)

      if (x > 0) {
        if (x0 === 0) {
          press(keys_by_button.get(button))
        }
      } else if (x === 0) {
        if (x0 > 0) {
          release(keys_by_button.get(button))
        }
      }
      
    })


  })

  return (<Zoom zoom={2}>
    <PianoPlay piano={piano} press={press} release={release}/>
    </Zoom>)
}

export const Knobs = () => {
  

  let [[_amp_envelope, _amp, _filter_envelope, _cutoff, _cutoff_max, _volume]] = useSound()

  let [[amp_envelope, amp_envelope_range], amp_env_api] = _amp_envelope

  let [[filter_envelope, filter_envelope_range], filter_env_api] = _filter_envelope


  let [amp, setAmp] = _amp

  let [cutoff, setCutoff] = _cutoff
  let [cutoff_max, setCutoffMax] = _cutoff_max
  let [volume, setVolume] = _volume

  return (<div class='knobs'>
    <Envelope unit="ms" unit_s="n" range={filter_envelope_range()} envelope={filter_envelope()} {...filter_env_api } name="filter_envelope"/>
    <Group name='cutoff'>
    <Knob klass='vertical' unit="n" range={[0, 1, 0.1]} value={cutoff()} setValue={setCutoff}/>
    <Knob name="max" klass='vertical' unit="n" range={[0, 1, 0.1]} value={cutoff_max()} setValue={setCutoffMax}/>
    </Group>

    <Envelope unit="ms" unit_s="n" range={amp_envelope_range()} envelope={amp_envelope()} {...amp_env_api } name="amp_envelope"/>
    <Group name='amplitude'>
    <Knob klass='vertical' unit="n" range={[0, 1, 0.1]} value={amp()} setValue={setAmp}/>
    </Group>

    <Knob name='Volume' klass='vertical' unit="n" range={[0, 1, 0.1]} value={volume()} setValue={setVolume}/>
    </div>)
}




export default () => {
  return (<SoundProvider>
    <Sound/>
  </SoundProvider>)
}


