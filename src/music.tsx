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

function model_to_free(model: ONoteOrChord) {
  if (Array.isArray(model)) {
    return model.map(model_to_free)
  } else {
    let { pitch, octave, duration, text } = model

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
         } else if (duration) {
           let _duration = model_durations.indexOf(duration) + 1
           let code = duration_codes[duration]

           code += '_note'
           return {
             code,
             pitch: _pitch,
             octave: _octave,
             klass: '',
             duration: _duration
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
 octave: Octave
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
               <FreeOnStaff klass={note.klass} pitch={note.pitch} octave={note.octave} ox={(i()+1)*2} oy={note.text ? -0.125 : 0}>{
                 note.code ? g[note.code] : <span class='text'>{note.text}</span>
               }</FreeOnStaff>
             }</For>
             :
             <FreeOnStaff klass={note_or_chord.klass} pitch={note_or_chord.pitch} octave={note_or_chord.octave} ox={(i()+1)*2} oy={note_or_chord.text ? -0.125 : 0}>{
             note_or_chord.code ? g[note_or_chord.code] : <span class='text'>{note_or_chord.text}</span>
             }</FreeOnStaff>
         }</For>
       </staff>

    </div>)
}

export const FreeOnStaff = (props) => {
  let { klass, children, pitch, octave, ox, oy } = props

  let x = (ox || 0)
  let y = pitch_y(pitch, octave) + (oy || 0)

  let style = {
   transform: `translate(${x}em, ${y}em)`
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
