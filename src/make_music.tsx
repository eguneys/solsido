import { splitProps, onMount, useContext, createContext, createSignal, createMemo, createEffect } from 'solid-js'
import { Zoom, PianoKeys, Sheet as _Sheet } from './music'

import { getKeyAtDomPos, eventPosition, point_in_rect } from './util'

import { Black, White, index_black, index_white } from './music/piano'
import { pianokey_pitch_octave } from './music/piano'
import { is_note, make_note, make_time_signature, time_bm_duration } from './music/types'
import { Piano as OPiano, Playback as OPlayback } from './piano'
import { ComposeSheet as OComposeSheet, note_free } from './sheet'

import { useApp } from './loop'

const MusicContext = createContext()

const useMusic = () => { return useContext(MusicContext) }

const MusicProvider = (props) => {

  let _time_signature = make_time_signature(2, 2)

  let [playback, setPlayback] = createSignal(new OPlayback(_time_signature), { equals: false })
  let [piano, setPiano] = createSignal(new OPiano(), { equals: false })
  let [composer, setComposer] = createSignal(new OComposeSheet(_time_signature), { equals: false })


  const bm = () => playback().bm
  const time_signature = () => composer().time_signature
  const store = [
    [piano, playback, composer],
    {
      bm,
      time_signature,
      playback_pos() {
        let { measure, beat, sub_beat } = playback()
        return composer().measure_beat_sub_pos(
          measure, beat, sub_beat)
      },
      notes() {
        return composer().notes
      },
      zero_notes() {
        return piano().zero(bm())
      },
      active_notes() {
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
            composer.add_measure()
            return composer})
      },
      quanti(quanti: BeatMeasure) {
        setPlayback(playback => {
            playback.bm += quanti
            return playback })
      },
      press(key: PianoKey) {
        setPiano(piano => {


          piano.actives(time_signature(), bm())
          .map(([t0, note]) => {
              // TODO make this a function
              let _calc_measures = new OPlayback(time_signature())
              _calc_measures.bm = t0
              let { measure, beat, sub_beat } = _calc_measures

            setComposer(composer => { 
              composer.add_cnr(measure, beat, sub_beat, note)
              return composer
            })
          })

          piano.release_previous(bm())
          let res = piano.push(key, bm())
          return piano
        })
      },
      release(key: PianoKey) {
        setPiano(piano => {
          let [t0, note] = piano.release(key, playback().bm)
          return piano
        })
      }
    }
  ]

  return (<MusicContext.Provider value={store}>
      {props.children}
    </MusicContext.Provider>)
}

const Music = () => {

  let [[piano, playback, composer], { add_measure, quanti }] = useMusic()
  let [input] = useApp()

  createEffect(() => {
    let _input = input()
    let ix = 1
    if (_input.btn('left')) {
      ix = -1
    } else if (_input.btn('right')) {
      ix = 1
    }

    if (_input.btnp('1')) {
      quanti(ix) 
    }    

    if (_input.btnp('!', true)) {
      quanti(ix * -1)
    }
  })


  add_measure()

  return (<div class='make-music'>
      <Sheet/>
      <PianoPlay/>
    </div>) 
}


const Sheet = (props) => {

  let [[piano, playback, composer], {
    quanti,
    playback_pos,
    active_notes,
    zero_notes,
    notes
  }] = useMusic()

  return (<Zoom zoom={4}>
      <_Sheet playback={playback()} piano={piano()} 
      playback_pos={playback_pos()}
      notes={notes()}
      zero_notes={zero_notes()}
      active_notes={active_notes()}/>
    </Zoom>)
}

const PianoPlay = () => {

  let [bounds, setBounds] = createSignal()

  let key_xys = createMemo(() => {
    let _bounds = bounds()

    if (!_bounds) {
      return [[], []]
    }

    let { width, height } = _bounds

    let black_xs = [0, 1, 3, 4, 5]
    let nb_keys = 7 * 4
    let white_xs = [...Array(nb_keys).keys()]
    let key_w = width /  nb_keys
    let black_y = height * 0.6

    let black_x0 = key_w * 0.6
    let black_key_w = key_w * 0.8

    let octave_w = key_w * 7

    return [
      [0, 1, 2, 3].flatMap(k => 
        black_xs.map(_ => [octave_w * k + black_x0 + _ * key_w, 0, black_key_w, black_y])),
      white_xs.map(_ => [0 + _ * key_w, 0, key_w, height])
    ]
  })

  let [[piano], { press, release }] = useMusic()

  let $piano
  onMount(() => {

    setBounds($piano.getBoundingClientRect())

    $piano.addEventListener('click', e => {
      let pos = eventPosition(e)
      let _bounds = bounds()

      press(getKeyAtDomPos(pos, _bounds, key_xys()))
    })
  })


  return (<Zoom klass="p-zoom" zoom={2}>
      <PianoKeys ref={$piano} piano={piano()} key_xys={key_xys()} n={4}/>
    </Zoom>)
}

export default () => {
  return (<MusicProvider>
    <Music/>
    </MusicProvider>)
}
