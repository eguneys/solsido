import { useRouter, RouterProvider, Link } from './router'
import { AppProvider } from './loop'

import Learn from './learn'
import Sound from './make_sound'
import Music from './make_music'

import Svg from './internal/make_svg'


const App = () => {

  return (<RouterProvider>
      <AppProvider>
        <div class='app-wrap'>
          <Header/>
          <Main/>
        </div>
      </AppProvider>
    </RouterProvider>)
}

const Home = () => {
  return (<div>
    Hello
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
        <section> <Link href='learn'> Learn </Link> </section>
      </nav>
    </div>
    </header>)
}

export default App
