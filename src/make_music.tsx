import { onCleanup, on, splitProps, onMount, useContext, createContext, createSignal, createMemo, createEffect } from 'solid-js'
import { Zoom, PianoKeys, Sheet as _Sheet } from './music'

import { getKeyAtDomPos, eventPosition, point_in_rect } from './util'

import { Black, White, index_black, index_white } from './music/piano'
import { pianokey_pitch_octave } from './music/piano'

import { btn_pitches_all, keys_by_button, btn_pianokey } from './buttons'
import { is_note, make_time_signature, time_note_value, time_bm_duration, time_duration_bm } from './music/types'
import { make_note_po } from './music/types'
import { Piano as OPiano, Playback as OPlayback, NotesInBms } from './piano'
import { chord_note_rest_duration, tempo_bpms } from './piano'
import { note_free } from './sheet'

import { make_adsr, PlayerController } from './audio/player'
import { PianoPlay } from './sound'

import { useApp } from './loop'
import { Link } from './router'

import { ComposerMoreTimes, grouped_lines_wrap } from './composer'

import { fen_composer, time_note_value_subs, fsum } from './composer'

const MusicContext = createContext()

const useMusic = () => { return useContext(MusicContext) }

const MusicProvider = (props) => {

  let _time_signature = make_time_signature(4, 4)

  let [playback, setPlayback] = createSignal(new OPlayback(_time_signature), { equals: false })
  let [piano, setPiano] = createSignal(new OPiano(), { equals: false })

  let [composer, setComposer] = createSignal(new ComposerMoreTimes(), { equals: false })
  let [tempo, setTempo] = createSignal(2)

  let synth = {
    volume: 1,
    amplitude: 0.7,
    cutoff: 0.6,
    cutoff_max: 0.2,
    amp_adsr: make_adsr(20, 80, 0.2, 100),
    filter_adsr: make_adsr(0, 80, 0.2, 0)
  }

  let player = new PlayerController(synth)


  createEffect(() => {
      console.log(composer().data, composer().fen)
      console.log(composer().notes)
      console.log(grouped_lines_wrap(composer().notes).lines)
  })

  const bm = () => playback().bm
  const time_signature = () => _time_signature
  const add_measure = () => {
    setComposer(composer => {
        composer.add_measure(time_signature())
        return composer})
  }

  const inc_tempo = (dir: Direction) => {
   setTempo(tempo => {
     if (!dir) {
       if (tempo < 7) {
         return tempo + 1
       } else {
         return 1
       }
     }
     return Math.max(1, Math.min(7, tempo + dir))
   })
  }

  const quanti = (quanti: BeatMeasure) => {
    setPlayback(playback => {
      if (quanti === 0) {
        playback.bm = 0
      } else {
        playback.bm += quanti
        playback.bm = Math.max(0, playback.bm)
      }
      return playback })
  }

  const _grouped_frees_with_times = () => {
    return grouped_frees_with_times(composer().notes)
  }

  add_measure()

  const store = [
    [piano, playback, composer, tempo],
    {
      setComposer,
      player,
      bm,
      time_signature,
      add_measure,
      playback_pos() {
        let { lines } = grouped_lines_wrap(composer().notes)

        let _bm = bm()
        let c_bm = 0
        let res
        lines.find(line =>
          line.find(({ x, measure }) => {
            if (c_bm + measure.nb_subs >= _bm) {
               let i_bm = 0
               return measure.notes.find(({x: _x, notes, bm_duration})=> {
                   if (c_bm + i_bm + bm_duration >= _bm) {
                   res = x + _x + 2
                   return true
                   } else {
                   i_bm += bm_duration
                   }
                 })
            }
            c_bm += measure.nb_subs
          })
        )
        return res
      },
      _composer() {
         return [grouped_lines_wrap(composer().notes)]
      },
      bars() {
        return composer().bars
      },
      zero_notes() {
        return piano().zero(bm()).map(pianokey_pitch_octave)

      },
      active_notes() {
        return []
      },
      press(key: PianoKey) {
        setPiano(piano => {


          piano.actives(time_signature(), bm())
          .map(([t0, note]) => {
              console.log(note, chord_note_rest_duration(note), time_duration_bm(time_signature(), chord_note_rest_duration(note)))
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
      inc_tempo,
      quanti,
      quanti_note(dir: Direction) {
        let sbm = bm() + dir
        let [_composer, bm_start] = composer().seek_composer(sbm) 
        if (_composer) {
          let [start_i] = _composer.scan_notes(sbm - bm_start, 1)
            let fwd = _composer.note_length_in_subs(_composer.data[start_i])
            quanti(fwd * dir)
        }
      },
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
      del_beat() {
        setComposer(composer => {
          if (composer.del_beat(bm())) {
            quanti(-8)
          }
          return composer
        })
      },
      dup_beat() {
        setComposer(composer => {
          composer.dup_beat(bm())
          return composer
        })
      },
      dup_measure() {

      }
    }
  ]

  return (<MusicContext.Provider value={store}>
      {props.children}
    </MusicContext.Provider>)
}


const ManualNotice = () => {
  return (<div class='box-padding notice'>
    <h2 class='underline'> Make Music </h2>
    <p class='red'> Piano may sound loud.</p>
    <p class='red'> Not ready for production, feedback welcome </p>
    <p> There is a manual in the <Link href='/' anchor='manual'>home page</Link> </p>
      </div>)
}

const Music = () => {

  let [[piano, playback, composer], { 
    player,
    bm,
    inc_tempo,
    add_measure, 
    quanti,
    quanti_note,
    del_beat,
    press,
    release
  }] = useMusic()
  let [input] = useApp()

  createEffect(on(input, (_input) => {

    if (_input.btnp('Backspace')) {
      del_beat()
    }

    if (_input.btnp('left')) {
      quanti_note(-1)
    } else if (_input.btnp('right')) {
      quanti_note(1)
    }

    let ix = 1
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

    if (_input.btnp('+')) {
      inc_tempo(1)
    } else if (_input.btnp('-')) {
      inc_tempo(-1)
    }
  }))



  return (<div class='make-music'>
      <ManualNotice/>
      <Sheet/>
      <Controls/>
      <Zoom zoom={2}>
        <PianoPlayWithKeyboard player={player} piano={piano} press={press} release={release}/>
      </Zoom>
      <DslEditor/>
    </div>) 
}

const DslEditor = () => {


  let [[piano, playback, composer, tempo], { setComposer }] = useMusic()

    let changing = false
  const onChange = (e) => {

    let data = e?.clipboardData?.getData('Text') || e.target.value
    let composer = fen_composer(data)
    if (composer) {
      changing = true
      setComposer(_ => composer[0])
      changing = false
    }

  }

  let $input
 
  createEffect(() => {
    composer()
    if (changing) { return }
    $input.value = composer().fen
  })

  let [copied, setCopied] = createSignal('Copy')
  const copyDsl = () => {
    $input.focus()
    $input.select()
    document.execCommand('copy')
    
    setCopied('Copied!')
    setTimeout(() => {
      setCopied('Copy')
    }, 1000)
  }

  const copiedKlass = () => {
    return copied() === 'Copied!' ? 'active' : ''
  }

  return (<div class="dsl-editor">
    <p> Copy paste the dsl data below to share your music. <span class={['copy', copiedKlass()].join(' ')} onClick={copyDsl}>{copied()}</span> </p>
    <textarea ref={$input} onChange={onChange} onPaste={onChange} rows="16" cols="80"/>
      </div>)

}

const PlaybackControls = () => {

  let [[piano, playback, composer, tempo], {
    player,
    
    time_signature,
    bm,
    inc_tempo,
    quanti,
    press,
    release
  }] = useMusic()
  let [input, timer] = useApp()

  let note_player

  createEffect(on(bm, bm => {
    if (!note_player) {
      return
    }

    let voice = note_player.voice(bm)

    if (voice && is_note(voice.note)) {
      let i = player.attack(voice.note, player.currentTime)
      player.release(i, player.currentTime + voice.d_s)
    }

  }))


  let i_bm = 0
  createEffect(on(timer, ({ dt }) => {
   if (note_player) {
     i_bm += dt

     // TODO hide
     if (i_bm >= note_player.tempo_bm_s(time_signature(), 1)*1000) {
       i_bm = 0
       quanti(1)
     }
   }
  }))

  createEffect(on(tempo, tempo => {
    if (note_player) {
      note_player.tempo = tempo
    }
  }))

  const play = () => {
    note_player = new NotesInBms(tempo(), composer().notes)
    quanti(0)
  }

  const stop = () => {
    quanti(0)
    note_player = undefined
  }

  
  const incTempo = () => {
    inc_tempo()
  }

  return (<div class='playback-controls'>
      <span class='tempo' title="Tempo" onClick={incTempo}>Tempo {tempo_bpms[tempo()]}</span>
      <span class='play-reset' title="Play/Reset" onClick={play}>Play</span>
      <span class='stop' title="Stop" onClick={stop}>Stop</span>
    </div>)
}


const PianoPlayWithKeyboard = (props) => {
  
  let { player, piano, press, release } = props
  let [input] = useApp()

  let keys0 = [],
    keys

  let key_instrument_map = new Map<PianoKey, number>()
  function play_on_controller() {
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
  }

  createEffect(play_on_controller)


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
      <PlaybackControls/>
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
    _composer,
  }] = useMusic()

  return (<Zoom zoom={3}>
      <_Sheet 
      playback={playback()} 
      piano={piano()} 
      playback_pos={playback_pos()}
      composer={_composer()}
      zero_notes={zero_notes()}
      active_notes={active_notes()}/>
    </Zoom>)
}

export default () => {
  return (<MusicProvider>
    <Music/>
    </MusicProvider>)
}
