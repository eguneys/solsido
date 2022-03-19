import { createEffect } from 'solid-js'
import g from './glyphs'

import read_fen from './music/format/read'
import { ClefTimeNoteOrChord as OCommandNoteOrChord } from './music/format/model'

import { white_index, black_index, is_black } from './music/piano'

import { composer_sheet } from './piano'

function pitch_y(pitch: Pitch, octave: Octave) {
  return ((4 - octave) * 7 + 7 - pitch) * 0.25 / 2
}

let clef_codes = ['gclef', 'bclef']
function clef_to_code(clef: Clef) {
  return clef_codes[clef - 1]
}

// 9 Not a pitch
let clef_pitches = [5, 9]
function clef_to_pitch(clef: Clef) {
  return clef_pitches[clef - 1]
}

const nb_note_value_codes = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
function nb_note_value_to_code(nb_note_value: NbNoteValue) {
  return nb_note_value_codes[nb_note_value] + '_time'
}

// 0 1 2 3 4 5 6 7 8 9 10 11 12
// _ d w h q e s t x
// z z o t f e s
const note_value_codes = ['zero', 'zero', 'one', 'two', 'four', 'eight', 'sixth']
function note_value_to_code(note_value: NoteValue) {
  return note_value_codes[note_value] + '_time'
}

let duration_codes = [undefined, 'double', 'whole', 'half', 'quarter', 'quarter', 'quarter', 'quarter']

let duration_stems = [undefined, undefined, undefined, 1, 1, 2, 3, 4]

let duration_rest_codes = [undefined, 'double', 'whole', 'half', 'quarter', 'eighth', 'sixteenth', 'thirtysecond', 'sixtyfourth']

export const Sheet = (props) => {
  return (<div class='m-wrap'>
    <Staff playback={props.playback} notes={composer_sheet(props.composer)}/>
    </div>)
}

export const Staff = (props) => {
  let { notes } = props

  return (<staff> <lines> <line/> <line/> <line/> <line/> <line/> </lines>
    <Show when={props.playback}>
      <Playback playback={props.playback}/>
    </Show>

    <For each={notes}>{ (note) =>
      <Switch>
        <Match when={note.pitch}>
          <NoteOnStaff note={note}/>
        </Match>
        <Match when={note.rest}>
          <RestOnStaff rest={note}/>
        </Match>
      </Switch>
    }</For>
  </staff>)
}

const NoteOnStaff = (props) => {
  let { note } = props


  let { pitch, octave, duration, ox, oy } = note

  let x = (ox || 0)
  let y = pitch_y(pitch, octave) + (oy || 0)

  let dklass = duration_codes[duration]
  let klass = ['note', dklass].join(' ')
  let glyph = g[dklass + '_note']

  let style = {
   transform: `translate(${x}em, ${y}em) translateZ(0)`
  }

  return (<span class={klass} style={style}>{glyph}</span>)
}

const RestOnStaff = (props) => {
  let { rest } = props

  let { ox, oy } = rest

  let x = (ox || 0)
  let y = pitch_y(7, 4) + (oy || 0)

  let duration = rest.rest
  let dklass = duration_rest_codes[duration]
  let klass = ['rest', dklass].join(' ')
  let glyph = g[dklass + '_rest']

  let style = {
   transform: `translate(${x}em, ${y}em) translateZ(0)`
  }

  return (<span class={klass} style={style}>{glyph}</span>)
}

const Bar = (props) => {
  let { i, ox } = props

  let x = (i+1) * 2 + (ox || 0),
      y = 0;

  let style = {
    transform: `translate(${x}em, -50%) translateZ(0)`
  }
  return (<span class='bar' style={style}/>)
}

const DoubleBar = (props) => {
  let { i } = props
  return (<>
      <Bar i={i} ox={0}/>
      <Bar i={i} ox={0.1}/>
      </>)
}


function transform_style(ox: number, oy: number) {
  return {
    transform: `translate(${ox}em, ${oy}em) translateZ(0)`
  }
}

let ledger_pitches = [undefined, [], [6, 4, 2], [6, 4], [6, 4], [6], [6], []]
let ledger_pitches6 = [undefined, [1], [1], [1, 3], [1, 3], [1, 3, 5], [1, 3, 5], [1, 3, 5, 7]]

function pitch_octave_ledgers(pitch: Pitch, octave: Octave) {
  if (octave === 4 && pitch === 1) {
    return [[1, 4]]
  }
  if (octave === 3) {
    return [[1, 4], ...ledger_pitches[pitch].map(_ => [_, 3])]
  }
  if (octave === 5 && pitch > 5) {
    return [[6, 5]]
  }
  if (octave === 6) {
    return [[6, 5], ...ledger_pitches6[pitch].map(_ => [_, 6])]
  }
  return []
}

export const FullOnStaff = (props) => {
  let { note, i } = props;

  let { pitch, octave } = note

  if (!pitch) {
    pitch = 7
    octave = 4
  }

  let ox = (i+1)*2
  let oy = pitch_y(pitch, octave)

  let ledger_oys = note.ledger ? pitch_octave_ledgers(note.pitch, note.octave)
  .map(_ => pitch_y(..._)) : []

  return (<>
      <FreeOnStaff klass={note.klass} pitch={pitch} octave={octave} ox={ox} oy={note.text ? -0.125 : 0}>{
      note.code ? g[note.code] : <span class='text'>{note.text}</span>
       }</FreeOnStaff>
       <Index each={ledger_oys}>{ (_oy) =>
         <span class='ledger' style={transform_style(ox, _oy())}/>
       }</Index>
       <Show when={note.accidental}>
         <Accidentals klass={note.klass} pitch={pitch} octave={octave} ox={ox} accidental={note.accidental}/>
       </Show>
       <Show when={note.dot}>
         <Dot klass={note.klass} pitch={pitch} octave={octave} ox={ox}/>
       </Show>
       <Show when={note.stem}>
          <Stem klass={note.klass} pitch={pitch} octave={octave} ox={ox} stem={note.stem}/>
       </Show>
      </>)
}

const Stem = (props) => {
  let { klass, pitch, octave, ox, stem } = props;

  let oy = pitch_y(pitch, octave)
  let style = transform_style(ox, oy)

  let direction = Math.sign(stem)

  let d_klass = direction === -1 ? 'up' : 'down'
 
  return (<span class={['stem', d_klass, klass].join(' ')} style={style}/>)
}

const Dot = (props) => {
  let { klass, pitch, octave, ox } = props;

  let oy = pitch_y(pitch, octave)
  let style = transform_style(ox, oy)
  
  return (<span class={['dot', klass].join('')} style={style}/>)
}

const accidental_code = [undefined, 'sharp', 'flat', 'dsharp', 'dflat']
const accidental_offset = [0, 0.25, 0.25, 0.3, 0.4]
const Accidentals = (props) => {
  let { klass, pitch, octave, ox, accidental } = props;

  let oy = pitch_y(pitch, octave)
  let style = transform_style(ox - accidental_offset[accidental], oy)
  
  return (<span class={klass} style={style}>{g[accidental_code[accidental] + '_accidental']}</span>)
}

export const FreeOnStaff = (props) => {
  let { klass, children, pitch, octave, ox, oy } = props

  let x = (ox || 0)
  let y = pitch_y(pitch, octave) + (oy || 0)

  let style = {
   transform: `translate(${x}em, ${y}em) translateZ(0)`
  }

  return (<span class={klass} style={style}>{children}</span>)
}

export const NotesDurationTable = (props) => {

  return (<div class='notes-duration-wrap'>
    <table>
          <thead>
            <tr><th>Name</th><th>Note</th><th>Rest</th><th colspan='2'>Equivalents</th></tr>
          </thead>
          <tbody>
            <tr> <td>Double Whole Note</td>
    <td> <FullOnFreeStaff duration={1} /> </td>
    <td> <FullOnFreeStaff rest={true} duration={1} ox={0.4} /> </td>
    <td>Two Whole Notes</td>
    <td>
      <FullOnFreeStaff duration={2} ox={0.1}/> 
      <FullOnFreeStaff duration={2} ox={0.6}/> 
    </td>
     </tr>
            <tr> <td>Whole Note</td> 
    <td> <FullOnFreeStaff duration={2}/> </td>
    <td> <FullOnFreeStaff rest={true} duration={2} ox={0.4} /> </td>
    <td>Two Half Notes</td>

    <td>
      <FullOnFreeStaff duration={3} ox={0.1}/> 
      <FullOnFreeStaff duration={3} ox={0.6}/> 
    </td>
    </tr>
            <tr> <td>Half Note</td> 
    <td> <FullOnFreeStaff duration={3}/> </td>
    <td> <FullOnFreeStaff rest={true} duration={3} ox={0.4} /> </td>

    <td>Two Quarter Notes</td>
    <td>
      <FullOnFreeStaff duration={4} ox={0.1}/> 
      <FullOnFreeStaff duration={4} ox={0.6}/> 

    </td>
    </tr>
            <tr> <td>Quarter Note</td>  
    <td> <FullOnFreeStaff duration={4}/> </td>
    <td> <FullOnFreeStaff rest={true} duration={4} ox={0.4} /> </td>
    <td>Two Eighth Notes</td>
    <td> 
      <FullOnFreeStaff duration={5} ox={0.1}/> 
      <FullOnFreeStaff duration={5} ox={0.6}/> 
    </td>
    </tr>
            <tr> <td>Eighth Note</td>  

    <td> <FullOnFreeStaff duration={5}/> </td>
    <td> <FullOnFreeStaff rest={true} duration={5} ox={0.4} /> </td>
    <td>Two Sixteenth Notes</td>
    <td></td>
    </tr>
           <tr> <td>Sixteenth Note</td>  

    <td> <FullOnFreeStaff duration={6}/> </td>
    <td> <FullOnFreeStaff rest={true} duration={6} ox={0.4} /> </td>
    <td>Two Thirty-second Notes</td>
    <td></td>
    </tr>
            <tr> <td>Thirty-second Note</td>  

    <td> <FullOnFreeStaff duration={7}/> </td>
    <td> <FullOnFreeStaff rest={true} duration={7} ox={0.4} /> </td>
    <td>Two Sixty-fourth Notes</td>
    <td></td>
     </tr>
          </tbody>
        </table>
    </div>)
}

export const FreeLines = (props: string) => {
}

export const FullOnFreeStaff = (props: string) => {
  let { rest, duration, ox } = props

  ox = ox === undefined ? 0.2: ox

  let pitch = rest ? 2 : 6
  let octave = rest ? 7 : 6
  let code = rest ? duration_rest_codes[duration] + '_rest' : duration_codes[duration] + '_note'
  let stem = rest ? undefined : duration_stems[duration] * -1

  let _klass = rest ? 'rest' : 'note'
  let d_klass = duration_rest_codes[duration]
 
  let klass = [_klass, d_klass].join(' ')

  let note = { 
    code,
    pitch,
    octave,
    klass,
    duration,
    stem
  }

  return (<div class='free-staff'>
      <Show when={!!rest}>
        <lines><line/><line/><line/><line/><line/></lines>
      </Show>
      <FullOnStaff note={note} i={-1 + ox}/>
    </div>)

}

let letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export const PianoKeys = (props) => {

  let { n, ref } = props

  let style = { width: `calc(${n} * 4em * 203/125)` }

  let _letters = [...Array(n)].flatMap(() => letters)

    function key_style(i: number) {
      return {
        transform: `translate(calc((${n} * 4em * 203/125) * ${i/(n*7)}), calc(2.5em))`
      }
    }

    function white_style(i: number) {
      return {
        width: `calc(4em * 203/125 / 7)`,
        height: `3.9em`,
        transform: `translate(calc((${n} * 4em * 203/125) * ${i/(n*7)}), calc(0em))`
      }
    }

    function black_style(i: number) {
      let [bxys, wxys] = props.key_xys
      let [x, y, w, h] = bxys[i]
      return {
        width: `calc(0.8 * 4em * 203/125 / 7)`,
        height: `calc(4em * 0.58)`,
        transform: `translate(${x}px, ${y}px)`
      }
    }

    return (
    <div ref={ref} class='p-wrap'>
       <div class='background' style={style}></div>
       <Index each={_letters}>{ (letter, i) =>
          <span class='letter' style={key_style(i)}>{letter}</span>
       }</Index>

      <Show when={!!props.piano}>
        <For each={[...props.piano.actives]}>{ active =>
           <Switch fallback= {
             <span class='active white' style={white_style(white_index(active))}/>
           }>
             <Match when={is_black(active)}>
               <span class='active black' style={black_style(black_index(active))}/>
             </Match>
           </Switch>
           }</For>
      </Show>
    </div>)
}

export const Playback = (props) => {

  let style = () => ({
      transform: `translate(calc(${2+props.playback.bm}em), -50%)` 
    })

  return (<div class='playback'>
      <span class='cursor' style={style()}/>
    </div>)
} 

export const Zoom = (props) => {
  return (<div class={['zoom', props.klass].join(' ')} style={`font-size: ${props.zoom}em`}>
    {props.children}
    </div>)
} 
