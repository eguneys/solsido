import { useRouter, RouterProvider, Link } from './router'

import Learn from './learn'
import Sound from './sound'
import Music from './music'


const App = () => {

  return (<RouterProvider>
      <div class='app-wrap'>
        <Header/>
        <Main/>
      </div>
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

const Main = (props) => {

  let [route] = useRouter()

  return (<div class='main-wrap'>
      <main>
        <Dynamic component={route_components[route()]}/>
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
