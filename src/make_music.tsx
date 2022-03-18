import { onMount, createSignal, createMemo, createEffect } from 'solid-js'
import { PianoKeys, Music as _Music } from './music'

import { eventPosition, point_in_rect } from './util'

import { Black, White, index_black, index_white } from './music/piano'

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



const Music = () => {

  let fen = `{ /clef treble }`

  return (<div class='make-music'>
      <_Music zoom={4} fen={fen}/>
      <PianoPlay/>
    </div>) 
}

const PianoPlay = () => {

  let [bounds, setBounds] = createSignal()
  let [notePress, setNotePress] = createSignal()

  let $piano
  onMount(() => {
    setBounds($piano.getBoundingClientRect())


    let key_xys = createMemo(() => {
      let { width, height } = bounds()

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


    $piano.addEventListener('click', e => {
      let pos = eventPosition(e)
      let _bounds = bounds()

      setNotePress(getKeyAtDomPos(pos, _bounds, key_xys()))
    })
  })

  createEffect(() => {
    console.log(notePress())
  })

  return (<div class='p-zoom'>
      <PianoKeys ref={$piano} n={4}/>
    </div>)
}


export default Music
