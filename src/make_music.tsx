import { splitProps, onMount, useContext, createContext, createSignal, createMemo, createEffect } from 'solid-js'
import { Zoom, PianoKeys, Sheet as _Sheet } from './music'

import { getKeyAtDomPos, eventPosition, point_in_rect } from './util'

import { Black, White, index_black, index_white } from './music/piano'
import { pianokey_pitch_octave } from './music/piano'

import { btn_pitches_all, keys_by_button, btn_pianokey } from './buttons'
import { is_note, make_time_signature, time_note_value, time_bm_duration } from './music/types'
import { make_note_po } from './music/types'
import { Piano as OPiano, Playback as OPlayback } from './piano'
import { chord_note_rest_duration } from './piano'
import { note_free } from './sheet'

import { make_adsr, PlayerController } from './audio/player'
import { PianoPlay } from './sound'

import { useApp } from './loop'

import { ComposerMoreTimes, grouped_frees_with_times } from './composer'

const MusicContext = createContext()

const useMusic = () => { return useContext(MusicContext) }

const MusicProvider = (props) => {

  let _time_signature = make_time_signature(4, 4)

  let [playback, setPlayback] = createSignal(new OPlayback(_time_signature), { equals: false })
  let [piano, setPiano] = createSignal(new OPiano(), { equals: false })

  let [composer, setComposer] = createSignal(new ComposerMoreTimes(), { equals: false })

createEffect(() => {
  console.log(composer().data, composer().dots)
})

  const bm = () => playback().bm
  const time_signature = () => _time_signature


  const quanti = (quanti: BeatMeasure) => {
    setPlayback(playback => {
      if (quanti === 0) {
        playback.bm = 0
      } else {
        playback.bm += quanti
      }
      return playback })
  }

  const store = [
    [piano, playback, composer],
    {
      bm,
      time_signature,
      playback_pos() {
        let { measure, beat, sub_beat } = playback()
        return 0
        return composer().measure_beat_sub_pos(
          measure, beat, sub_beat)
      },
      time_and_notes() {
        return grouped_frees_with_times(composer().notes)
      },
      bars() {
        return composer().bars
      },
      zero_notes() {
        return piano().zero(bm()).map(pianokey_pitch_octave)

      },
      active_notes() {
        return []
        return piano().actives(time_signature(), bm()).map(([t0, note]) => {

            let _calc_measures = new OPlayback(time_signature())
            _calc_measures.bm = t0

            let { measure, beat, sub_beat } = _calc_measures
            let x = composer().measure_beat_sub_pos(
                measure, beat, sub_beat)

            let cnr
            if (Array.isArray(note)) {
              cnr = note.map(note_free)
            } else {
              cnr = note_free(note)
            }
            return { cnr, x }
          })
      },
      add_measure() {
        setComposer(composer => {
            composer.add_measure(time_signature())
            return composer})
      },
      press(key: PianoKey) {
        setPiano(piano => {


          piano.actives(time_signature(), bm())
          .map(([t0, note]) => {
              setComposer(composer => { 
                composer.add_cnr(t0, note)
                return composer
              })
          })

          let res = piano.push(key, bm())
          piano.release_previous(bm())
          return piano
        })
      },
      release(key: PianoKey) {
        setPiano(piano => {
          return piano
        })
      },
      quanti,
      go_beat_0() {
        quanti(0)
      },
      fw_beat() {
        quanti(1)
      },
      bw_beat() {
        quanti(-1)
      },
      rel_piano() {
        setPiano(piano => {
          piano.release_all()
          return piano
            })
      },
      dup_beat() {
        // TODO make this a function
        let _calc_measures = new OPlayback(time_signature())
          _calc_measures.bm = bm()
          let { measure, beat, sub_beat } = _calc_measures

        setComposer(composer => {
            composer.dup_beat(measure, beat)
            return composer
            })
      },
      dup_measure() {
        // TODO make this a function
        let _calc_measures = new OPlayback(time_signature())
          _calc_measures.bm = bm()
          let { measure, beat, sub_beat } = _calc_measures

        setComposer(composer => {
            composer.dup_measure(measure)
            return composer
            })
      }
    }
  ]

  return (<MusicContext.Provider value={store}>
      {props.children}
    </MusicContext.Provider>)
}

const Music = () => {

  let [[piano, playback, composer], { 
    bm,
    add_measure, 
    quanti,
    press,
    release
  }] = useMusic()
  let [input] = useApp()

  createEffect(() => {
    let _input = input()
    let ix = 1
    if (_input.btn('left')) {
      ix = -1
    } else if (_input.btn('right')) {
      ix = 1
    }

    if (_input.btnp('0')) {
      quanti(0)
    } else if (_input.btnp('1')) {
      quanti(ix) 
    } else if (_input.btnp('2')) {
      quanti(ix * 2)
    } else if (_input.btnp('4')) {
      quanti(ix * 4)
    }    

    if (_input.btnp('!', true)) {
      quanti(ix * -1)
    } else if (_input.btnp('@', true)) {
      quanti(ix * -2)
    } else if (_input.btnp('$', true)) {
      quanti(ix * 4 * -1)
    }
  })


  add_measure()

  return (<div class='make-music'>
      <Sheet/>
      <Controls/>
      <Zoom zoom={2}>
        <PianoPlayWithKeyboard piano={piano} press={press} release={release}/>
      </Zoom>
    </div>) 
}

const PianoPlayWithKeyboard = (props) => {
  
  let { piano, press, release } = props
  let [input] = useApp()

  let synth = {
    volume: 0.3,
    amplitude: 0.5,
    cutoff: 0.7,
    cutoff_max: 0.0,
    amp_adsr: make_adsr(0, 0, 0.2, 0),
    filter_adsr: make_adsr(0, 0, 0.5, 0)
  }


  let player = new PlayerController(synth)

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



  return (<PianoPlay piano={piano} press={press} release={release}/>)
}

const Controls = () => {

  let [_, { 
    dup_beat,
    dup_measure,
    rel_piano,
    fw_beat,
    bw_beat,
    go_beat_0
  }] = useMusic()
 

  return (<div class='controls'>
      <span class='dup-beat' title='Duplicate Beat' onClick={dup_beat}>Dup Beat</span>
      <span class='dup-measure' title='Duplicate Measure' onClick={dup_measure}>Dup Measure</span>
      <span class='rel-piano' title='Cancel Piano Press' onClick={rel_piano}>Cancel Press</span>
      <span class='bw-beat' title='Go to Start' onClick={go_beat_0}>Go Start</span>
      <span class='bw-beat' title='Go Backward' onClick={bw_beat}>Backward</span>
      <span class='fw-beat' title='Go Forward' onClick={fw_beat}>Forward</span>
      </div>)
}


const Sheet = (props) => {

  let [[piano, playback, composer], {
    quanti,
    playback_pos,
    active_notes,
    zero_notes,
    time_and_notes,
  }] = useMusic()

  return (<Zoom zoom={3}>
      <_Sheet playback={playback()} piano={piano()} 
      playback_pos={playback_pos()}
      time_and_notes={time_and_notes()}
      zero_notes={zero_notes()}
      active_notes={active_notes()}/>
    </Zoom>)
}

export default () => {
  return (<MusicProvider>
    <Music/>
    </MusicProvider>)
}
