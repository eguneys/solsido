import { splitProps, onMount, useContext, createContext, createSignal, createMemo, createEffect } from 'solid-js'
import { Zoom, PianoKeys, Sheet as _Sheet } from './music'

import { eventPosition, point_in_rect } from './util'

import { Black, White, index_black, index_white } from './music/piano'
import { pianokey_pitch_octave } from './music/piano'
import { make_note, make_time_signature, time_bm_duration } from './music/types'
import { Piano as OPiano, Playback as OPlayback, ComposeInTime as OComposeInTime } from './piano'
import { composer_sheet, composer_sheet_context_intime, nr_free } from './piano'

import { useApp } from './loop'


export const getKeyAtDomPos = (epos: NumberPair, bounds: ClientRect, key_xys: [Array<NumberRect>, Array<NumberRect>]) => {
  let x = epos[0] - bounds.left,
    y = epos[1] - bounds.top


  let [bxys, wxys] = key_xys

  let b_key = bxys.findIndex(_ => point_in_rect(_, x, y))
  if (b_key >= 0) {
    return index_black(b_key)
  }

  let w_key = wxys.findIndex(_ => point_in_rect(_, x, y))

  return index_white(w_key)
}

const MusicContext = createContext()

const useMusic = () => { return useContext(MusicContext) }

const MusicProvider = (props) => {

  let _time_signature = make_time_signature(2, 2)

  let [playback, setPlayback] = createSignal(new OPlayback(_time_signature), { equals: false })
  let [piano, setPiano] = createSignal(new OPiano(), { equals: false })
  let [composer, setComposer] = createSignal(new OComposeInTime(_time_signature), { equals: false })

  const composer_ctx = () => {
    return composer_sheet_context_intime(composer(), playback().bm)
  }

  const bm = () => playback().bm
  const time_signature = () => composer().time_signature

  const store = [
    [piano, playback, composer],
    {
      bm,
      time_signature,
      composer_ctx,
      zero_notes() {
        return piano().zero(bm())
      },
      active_notes() {
        return piano().all.flatMap(([t0, keys]) => {
            if (t0 >= bm()) {
              return []
            }
            let ctx = composer_sheet_context_intime(composer(), t0)

            return [keys.map(key => {
                let nr = make_note(...pianokey_pitch_octave(key), time_bm_duration(time_signature(), bm() - t0))
                return nr_free(nr, ctx)
                })]
            })
      },
      composer_sheet() {
        return composer_sheet(composer())
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
            let adds = piano.release_previous(bm())
            adds.forEach(([t0, keys]) => {
                let duration = bm() - t0
                let res = keys.map(key => make_note(...pianokey_pitch_octave(key), duration))
                setComposer(composer => { 
                  composer.add_notes(t0, res)
                  return composer
                  })
                })

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


createEffect(() => {
console.log(composer().nrs)
})

  add_measure()

  return (<div class='make-music'>
      <Sheet/>
      <PianoPlay/>
    </div>) 
}


const Sheet = (props) => {

  let [[piano, playback, composer], {
    quanti ,
    composer_ctx,
    composer_sheet,
    active_notes,
    zero_notes
  }] = useMusic()

  return (<Zoom zoom={4}>
      <_Sheet playback={playback()} piano={piano()} 
    composer_ctx={composer_ctx()}
    composer_sheet={composer_sheet()}
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
