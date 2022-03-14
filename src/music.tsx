import g from './glyphs'

function pitch_y(pitch: Pitch, octave: Octave) {
  return ((4 - octave) * 7 + 7 - pitch) * 0.25 / 2
}

export const Music = (props) => {
  let { fen } = props

  let clef = fen

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
            <FreeOnStaff code='gclef' pitch={5} octave={4} ox={0.25}></FreeOnStaff>
         </Show>
       </staff>

    </div>)
}

export const FreeOnStaff = (props) => {
  let { code, pitch, octave, ox, oy } = props

  let x = (ox || 0)
  let y = pitch_y(pitch, octave) + (oy || 0)

  let style = {
    transform: `translate(${x}em, ${y}em)`
  }

  return (<span style={style}>{g[code]}</span>)
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
