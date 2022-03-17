import { Link } from './router'
import Learn from './learn'


const App = () => {
  return (
    <div class='app-wrap'>
      <Header/>
      <Main/>
    </div>)
}

const Main = (props) => {
  return (<div class='main-wrap'>
      <main>
        <Learn/>
      </main>
    </div>)
}

const Header = (props) => {

  return (<header>
    <div class='site-title-nav'>
      <h1 class='site-title'> <a href='/'> lasolsido<span>.org</span></a></h1>
      <nav>
        <section> <Link href='/'> Home </Link> </section>
        <section> <Link href='/sound'> Sound </Link> </section>
        <section> <Link href='/music'> Music </Link> </section>
        <section> <Link href='/learn'> Learn </Link> </section>
      </nav>
    </div>
    </header>)
}

export default App
