
import { createEffect, createSignal, createContext, useContext } from 'solid-js'
import { createEnvelope, Envelope, Knob, Group } from './sound'
import { PianoPlay } from './sound'

import { make_adsr, PlayerController } from './audio/player'
import { Zoom, PianoKeys } from './music'
import { make_note } from './music/types'
import { pianokey_pitch_octave } from './music/piano'

import { Piano as OPiano } from './piano'

const SoundContext = createContext()

const useSound = () => { return useContext(SoundContext) }

const SoundProvider = (props) => {
  let amp_envelope = createEnvelope(make_adsr(0, 0, 1, 0), make_adsr(
    [0, 0.5, 0.1],
    [0, 0.5, 0.1], 
    [0, 1, 0.2], 
    [0, 1, 0.2]))

  let _amp = createSignal(1)

  const store = [
    [amp_envelope, _amp]
  ]

  return (<SoundContext.Provider value={store}>
    {props.children}
    </SoundContext.Provider>)
}


export const Sound = () => {

  let player = new PlayerController({
    amplitude: 1,
    cutoff: 2000,
    amp_adsr: make_adsr(0, 0, 1, 0),
    filter_adsr: make_adsr(0, 0, 1, 0)
  })

  let [piano, setPiano] = createSignal(new OPiano(), { equals: false })

  let keys0 = [],
    keys

  let key_instrument_map = new Map<PianoKey, number>()
  createEffect(() => {
    keys = piano().all_keys.flat()
    
    let added = keys.filter(_ => !keys0.includes(_))
    let removed = keys0.filter(_ => !keys.includes(_))

    added.forEach(key => {
      let po = pianokey_pitch_octave(key)
      let i = player.attack(make_note(...po, 2), player.currentTime)
      key_instrument_map.set(key, i)
    })
    removed.forEach(key => {
      let i = key_instrument_map.get(key)
      player.release(i, player.currentTime)
      key_instrument_map.delete(key)
    })

    keys0 = keys
  })


  const press = (key: PianoKey) => {
    setPiano(piano => {
      piano.push(key, 0)
      return piano
    })
  }

  const release = () => {
    setPiano(piano => {
      piano.release_previous(1)
      return piano
    })
  }

  return (<div class='make-sound'>
    <Knobs/>
    <Zoom zoom={2}>
      <PianoPlay piano={piano} press={press} release={release}/>
    </Zoom>
  </div>)
}

export const Knobs = () => {
  

  let [[_amp_envelope, _amp]] = useSound()

  let [[amp_envelope, amp_envelope_range], amp_env_api] = _amp_envelope

  let [amp, setAmp] = _amp

  return (<div class='knobs'>
    <Envelope unit="ms" range={amp_envelope_range()} envelope={amp_envelope()} {...amp_env_api } name="filter_envelope"/>
    <Group name='cutoff'>
    <Knob klass='vertical' unit="freq" range={[0, 1, 0.1]} value={amp()} setValue={setAmp}/>
    <Knob name="max" klass='vertical' unit="freq" range={[0, 1, 0.1]} value={amp()} setValue={setAmp}/>
    </Group>

    <Envelope unit="ms" range={amp_envelope_range()} envelope={amp_envelope()} {...amp_env_api } name="amp_envelope"/>
    <Group name='amplitude'>
    <Knob klass='vertical' unit="n" range={[0, 1, 0.1]} value={amp()} setValue={setAmp}/>
    </Group>
    </div>)
}




export default () => {
  return (<SoundProvider>
    <Sound/>
  </SoundProvider>)
}


