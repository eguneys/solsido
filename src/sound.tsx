import { getKeyAtDomPos, eventPosition } from './util'
import { onCleanup, onMount, createSignal, createEffect } from 'solid-js'
import { PianoKeys } from './music'

function unbindable(
  el: EventTarget,
  eventName: string,
  callback: EventListener,
  options?: AddEventListenerOptions
) {
  el.addEventListener(eventName, callback, options);
  return () => el.removeEventListener(eventName, callback, options);
}

const mouchEvents = ['touchstart', 'mousedown']
const mouchEndEvents = ['touchend', 'mouseup']

export const createEnvelope = (_env, _env_range) => {

  let [env, setEnv] = createSignal(_env, { equals: false })
  let [env_range, setEnvRange] = createSignal(_env_range, { equals: false })

  return [
    [env, env_range], {
      setAttack(a) {
        setEnv(env => {
          env.a = a
          return env
        })
      },
      setDecay(d) {
        setEnv(env => {
          env.d = d
          return env
        })
      },
      setSustain(s) {
        setEnv(env => {
          env.s = s
          return env
        })
      },
      setRelease(r) {
        setEnv(env => {
          env.r = r
          return env
        })
      }
    }]
}

export const Envelope = (props) => {
  let { setAttack, setDecay, setSustain, setRelease } = props

  let klass = ['envelope', props.name.toLowerCase()].join(' ')

  return (<div class={klass}>
    <Group name={props.name} klass='vertical'>
      <Knob name='attack' range={props.range.a} unit={props.unit} value={props.envelope.a} setValue={setAttack}/>
      <Knob name='decay' range={props.range.d} unit={props.unit} value={props.envelope.d} setValue={setDecay}/>
      <Knob name='sustain' range={props.range.s} unit={props.unit} value={props.envelope.s} setValue={setSustain}/>
      <Knob name='release' range={props.range.r} unit={props.unit} value={props.envelope.r} setValue={setRelease}/>
    </Group>
  </div>)
}

export const Group = (props) => {
  let klass = ['group', props.klass].join(' ')
  return (<div class={klass}>
    <strong>{props.name}</strong>
    <div class='values'>{props.children}</div>
  </div>)
}

export const Knob = (props) => {
  let { klass, name, range, setValue } = props

  return (<div class={['knob', klass].join(' ')}>
    <span class='name'>{name}</span>
    <span class='value'>{props.value} {props.unit}</span>
    <input orient={klass} value={props.value} min={props.range[0]} max={props.range[1]} step={props.range[2]} onInput={e => setValue(e.target.value)} type='range'/>
    </div>)
}

export const PianoPlay = (props) => {
  let { press, release, piano } = props

  let [bounds, setBounds] = createSignal()

  let key_xys = () => {
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
  }

  createEffect(() => {
    console.log(bounds())
  })

  let $piano
  onMount(() => {

    setBounds($piano.getBoundingClientRect())

    let unbinds = []

    const onstart = e => {
      let pos = eventPosition(e)
      let _bounds = bounds()
      press(getKeyAtDomPos(pos, _bounds, key_xys()))
    }
    mouchEvents.forEach(ev => unbinds.push(unbindable($piano, ev, onstart, { capture: true })))
    const onend = e => { release() }
    mouchEndEvents.forEach(ev => unbinds.push(unbindable(document, ev, onend)))

    const onScroll = () => setBounds($piano.getBoundingClientRect())
    unbinds.push(unbindable(document, 'scroll', onScroll, { capture: true, passive: true }))
    unbinds.push(unbindable(window, 'resize', onScroll, { passive: true }))

    onCleanup(() => unbinds.forEach(_ => _()))
  })


  return (<PianoKeys ref={$piano} piano={piano()} key_xys={key_xys()} n={4}/>)
}


