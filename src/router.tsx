import { createEffect, createSignal, createContext, useContext } from 'solid-js'

const href_routes = [undefined, '', 'sound', 'music', 'learn',
'learn/preface',
'learn/introduction',
'learn/references']

const internal_routes = [undefined, 'internal', 'internal/svg']

const RouterContext = createContext()

export function RouterProvider(props) {
  let _route = href_route(window.location.pathname)

  const [route, setRoute] = createSignal(_route || internal_route(window.location.pathname) || 1)

  let _ignore = false
  createEffect(() => {
    // depend on route always
    route()
    if (route() > 10) return
    !_ignore && window.history.pushState({}, "", '/' + href_routes[route()])
  })

  window.addEventListener('popstate', () => {
    let _route = href_route(window.location.pathname)
    _ignore = true
    _route && setRoute(_route)
    _ignore = false
  })

  const store = [
    route, {
      setRoute,
      home() { setRoute(1) },
      sound() { setRoute(2) },
      music() { setRoute(3) },
      learn() { setRoute(4) }
    }
  ]

  return (<RouterContext.Provider value={store}>
     {props.children}
     </RouterContext.Provider>)
  
}

export function useRouter() { 
  return useContext(RouterContext) 
}

function href_route(href) {
  let res = href_routes.indexOf(href.replace(/^(\/)/, ''))

  if (res !== -1) {
    return res
  }
}

function internal_route(href) {
  let res = internal_routes.indexOf(href.replace(/^(\/)/, ''))
  if (res !== -1) {
    return res + 10
  }
}



export const Link = (props) => {
  let { href, children, anchor } = props;

  let [route, { setRoute }] = useRouter()

  let _route = href_route(href)

  let onClick = (e) => {
    e.preventDefault()
    setRoute(_route)
    if (anchor) {
      let $el = document.getElementById(anchor)
      if ($el) {
        $el.scrollIntoView()
      }
    }
  }

  return (
    <a
    href={href}
    onClick={onClick}>{children}</a>)
}



export const DivLink = (props) => {
  let { href, children } = props;

  let [route, { setRoute }] = useRouter()

  let _route = href_route(href)

  let onClick = (e) => {
    e.preventDefault()
    setRoute(_route)
  }

  let klass = () => {
    if (route() === _route) {
     return 'active'
    }
  }

  return (
    <div class={['link', klass()].join(' ')} onClick={onClick}>{children}</div>)
}
