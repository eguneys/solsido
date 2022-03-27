import { ErrorBoundary, createSignal, createEffect } from 'solid-js'
import { useRouter, RouterProvider, Link } from './router'
import { AppProvider } from './loop'

import Learn from './learn'
import Sound from './make_sound'
import Music from './make_music'

import Svg from './internal/make_svg'


const App = () => {

  return (    <RouterProvider>
      <AppProvider>
        <div class='app-wrap'>
          <Header/>
          <ErrorBoundary fallback={(err, reset) =>
              <ErrorRecovery reset={reset}/>
            }>
            <Main/>
          </ErrorBoundary>
        </div>
      </AppProvider>
    </RouterProvider>)
}

const random = (word) => {
let i = Math.random() * word.length
  return word.slice(i, i + Math.random() * 4)
}

const ErrorRecovery = (props) => {
  let { reset } = props
  let [i_reload, set_i] = createSignal(4)
  let [route, { home }] = useRouter()
  let [pops, setPops] = createSignal([], { equals: false })

  createEffect(() => {
    if (i_reload() === 0) {
    reset()
    home()
    }
  })

  setInterval(() => {
    set_i(p => Math.max(0, p - 1))
      }, 1000)

  let words = 'App crashed$@%^Dont go there#*)(+_!'

  setInterval(() => {
setPops(p => {
    p.forEach(_ => {
        _.siy[1](iy => iy + Math.random()/ 10)
        })
return p
    })

    if (Math.random() < 0.7) {
      let six = createSignal(-1 + 2 * Math.random()),
          siy = createSignal(-1 + 2 * Math.random())
      setPops(p => {
        p.push({
          word: random(words) + random(words),
          six,
          siy,
          })
        p.splice(20, 1)
        for (let i = 0; i < 5; i++) {
          if (Math.random() < 0.1) {
            p.shift()
          }
        }

        return p
        })
    }
  }, 80)

  return (<div class="error">
    <For each={pops()}>{ pop =>
      <span class="pop" style={{transform: `translate(${pop.six[0]()*100}%, ${pop.siy[0]()*100}%)` }}>{pop.word}</span>
    }</For>
     <section>
       <h2> <span class="glitch" title="App crashed">App crashed. </span> <small>Returning home page in {i_reload} seconds...</small> </h2>
     </section>
     </div>)
}

const Home = () => {
  return (<div class='home'>

    <section>
      <h1 class='head-one'>THIS IS <span class='brand'><Link href='/'>lasolsido </Link></span> AND</h1>
      <h1 class='head-two'>IT IS ABOUT MUSIC LEARNING AND PRODUCING.</h1>
    </section>
    <section class='features'>
     <div class='left'>
      <h2> Features on Agenda </h2>
      <ul>
        <li> <div><Link href='sound'>Sound Synthesizer</Link></div> </li>
        <li> <div><Link href='music'>Music Editor</Link></div> </li>
        <li> <div><Link href='learn'>Music Theory Learning Material</Link></div> </li>
        <li> <div><Link href='learn'>Music, Sound, Piano Challenges</Link></div> </li>
      </ul>
    </div>
    <div class='right'>
      <h2> Features on Plan </h2>
      <ul>
        <li> <div>MIDI Support</div> </li>
        <li> <div>Pro mode music production</div> </li>
        <li> <div>Pro mode sound synthesis</div> </li>
        <li> <div>Audio Visualizer</div> </li>
      </ul>
    </div>
    </section>
    
    <section class='extra'>
      <p> Project is open source, you are welcome to help. <small> See <Link href="learn/preface"> Preface </Link></small> </p>
    </section>

    <section class='extra'>

      <div class='manual'>
      <h2> Notice and Manual </h2>

      <p class='red'> Playing the piano might sound loud, beware of your volume. If the keys stick try pressing the piano key again, or refresh the page. </p>
      <p class='red'> The material in Learn section is not reviewed and may be inaccurate. </p>
      <p> Although project is not near completion, and in progress, this is some manual: </p>

        Compose music and draw notes on the sheet by playing notes on the piano.
    <br/>
        There is an orange cursor on the sheet, that shows your current location on the sheet. 
    <br/>
        The top indicator `1m. 1 beat 1 sub` shows your location.
    <br/>
        Press a piano key to activate it. Move the cursor forward to determine the note duration. 
    <br/>
        The note begins at the point you press the piano, and ends at the point you release the piano.
    <br/>
        Press any other key at some other point in time to release the previously active key press.
    <br/>
        If you press a piano key again at the same point you activated it, it will deactivate without putting a note on the sheet.
    <br/>

    <h2> Piano Keys </h2>
    <p> One octave of keys: <strong>Space j k l ; ' \</strong> </p>
    <p> Another octave of keys: <strong>a s d f g h</strong> </p>
    <p> Black keys are one row up on the keyboard </p>
    <h2> Buttons </h2>
    <ul>
      <li>  <strong>Dup Beat:</strong> Duplicate the beat the cursor is on
      </li>
      <li>
        <strong>Dup Measure:</strong> Duplicate the measure the cursor is on
      </li>
      <li>
        <strong>Cancel:</strong> Cancel active piano presses
      </li>
      <li>
        <strong>Backward:</strong> Move the cursor backward one sub beat
      </li>
      <li>
        <strong>Forward:</strong> Move the cursor forward one sub beat
      </li>
    </ul>

        <h2>Shortcuts:</h2>

        <ul>
        <li>
        <strong>1:</strong> Forward one sub beat
        </li>
        <li>
        <strong>4:</strong> Forward 4 sub beats
        </li>
        <li>
        <strong>Shift + 1:</strong> Backward one sub beat
        </li>
        <li>
        <strong>Shift + 4:</strong> Backward 4 sub beats
        </li>

        </ul>

    </div>
        
      </section>
      </div>)
}

const route_components = [Home, Home, 
Sound, Music, 
Learn, Learn, Learn, Learn, Learn]

const internal_components = [Svg, Svg, Svg]

const Main = (props) => {

  let [route] = useRouter()

  return (<div class='main-wrap'>
      <main>
        <Switch fallback={
          <Dynamic component={route_components[route()]}/> }>
          <Match when={route()>10}>
            <div class='internal'>
              <Dynamic component={internal_components[route()-10]}/>
            </div>
          </Match>
          </Switch>
      </main>
    </div>)
}

const Header = (props) => {

  return (<header>
    <div class='site-title-nav'>
      <h1 class='site-title'> <a href='/'> lasolsido<span>.org</span></a></h1>
      <nav>
        <section> <Link href='/'> Home </Link> </section>
        <section> <Link href='sound'> Sound </Link> </section>
        <section> <Link href='music'> Music </Link> </section>
        <section> <Link href='learn/introduction'> Learn </Link> </section>
      </nav>
    </div>
    </header>)
}

export default App
