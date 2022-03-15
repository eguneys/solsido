import g from './glyphs'

import read_fen from './music/format/read'
import { NoteOrChord as ONoteOrChord } from './music/format/model'

function pitch_y(pitch: Pitch, octave: Octave) {
  return ((4 - octave) * 7 + 7 - pitch) * 0.25 / 2
}

const model_clefs = ['treble', 'bass']
function model_to_clef(_clef: string) {
  let clef = model_clefs.indexOf(_clef) + 1
  if (clef > 0) {
    return clef
  }
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

let model_pitches = ['c', 'd', 'e', 'f', 'g', 'a', 'b']
let model_octaves = [3, 4, 5, 6]
let model_durations = ['1', '2', '4', '8', '16', '32']

let duration_codes = ['dwhole', 'whole', 'half', 'quarter', 'quarter', 'quarter', 'quarter']

let accidentals = ['is', 'es', 'isis', 'eses']

function model_to_free(model: ONoteOrChord) {
  if (Array.isArray(model)) {
    return model.map(model_to_free)
  } else {
    let { pitch, octave, duration, text, accidental } = model

    let _pitch = model_pitches.indexOf(pitch) + 1
    let _octave = model_octaves[octave]
    if (_pitch > 0) {

      if (!!_octave) {
         if (text) {
            return {
              pitch: _pitch,
              octave: _octave,
              klass: '',
              text 
            }
         } else {
           duration = duration || 1
           let _duration = model_durations.indexOf(duration) + 1
           let code = duration_codes[duration]

           code += '_note'

           let _accidental = (accidentals.indexOf(accidental) + 1) || undefined

           return {
             code,
             pitch: _pitch,
             octave: _octave,
             ledger: true,
             klass: '',
             duration: _duration,
             accidental: _accidental
           }
         }
      }
    }


  }
}

type OFreeOnStaff = {
 duration?: string,
 text?: string,
 code?: string,
 klass: string,
 pitch: Pitch,
 octave: Octave,
 ledger?: number,
 accidental?: Accidental
}

export const Music = (props) => {
  let { fen } = props
    fen ||= ''
  let music_model = read_fen(fen)

  let clef
  let notes
  if (music_model) {
    clef = model_to_clef(music_model.staff.clef)
    notes = model_to_free(music_model.staff.notes)
  }

  return (
    <div class='m-wrap' style={{ 'font-size': `${props.zoom||1}em` }}>
       <staff>
         <lines>
            <line/>
            <line/>
            <line/>
            <line/>
            <line/>
         </lines>
         <Show when={!!clef}>
            <FreeOnStaff klass='' pitch={clef_to_pitch(clef)} octave={4} ox={0.25}>{g[clef_to_code(clef)]}</FreeOnStaff>
         </Show>
         <For each={notes}>{ (note_or_chord, i) =>
           Array.isArray(note_or_chord) ?
             <For each={note_or_chord}>{ (note) =>
               <FullOnStaff note={note} i={i}/>
             }</For>
             : <FullOnStaff note={note_or_chord} i={i}/>
         }</For>
       </staff>

    </div>)
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

  let ox = (i()+1)*2
  let oy = pitch_y(note.pitch, note.octave)

  let ledger_oys = note.ledger ? pitch_octave_ledgers(note.pitch, note.octave)
  .map(_ => pitch_y(..._)) : []


  return (<>
      <FreeOnStaff klass={note.klass} pitch={note.pitch} octave={note.octave} ox={ox} oy={note.text ? -0.125 : 0}>{
      note.code ? g[note.code] : <span class='text'>{note.text}</span>
       }</FreeOnStaff>
       <Index each={ledger_oys}>{ (_oy) =>
         <span class='ledger' style={transform_style(ox, _oy())}/>
       }</Index>
       <Show when={note.accidental}>
         <Accidentals pitch={note.pitch} octave={note.octave} ox={ox} accidental={note.accidental}/>
       </Show>
      </>)
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



let letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export const PianoKeys = (props) => {

  let { n } = props
  let style = { width: `calc(${n} * 4em * 203/125)` }

  let _letters = [...Array(n)].flatMap(() => letters)

    function key_style(i: number) {
      return {
        transform: `translate(calc((${n} * 4em * 203/125) * ${i/(n*7)}), calc(2.5em))`
      }
    }

    return (
    <div class='p-wrap'>
       <div class='background' style={style}></div>
       <Index each={_letters}>{ (letter, i) =>
          <span class='letter' style={key_style(i)}>{letter}</span>
       }</Index>
    </div>)
}
