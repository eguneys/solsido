import { createEffect, createSignal, createContext, useContext } from 'solid-js'

const href_routes = [undefined, '', 'sound', 'music', 'learn']

const RouterContext = createContext()

export function RouterProvider(props) {
  let _route = href_route(window.location.pathname)

  const [route, setRoute] = createSignal(_route || 1)

  let _ignore = false
  createEffect(() => {
    // depend on route always
    route()
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
  return href_routes.indexOf(href.split('/').slice(-1)[0])
}


export const Link = (props) => {
  let { href, children } = props;

  let [route, { setRoute }] = useRouter()

  let _route = href_route(href)

  let onClick = (e) => {
    e.preventDefault()
    setRoute(_route)
  }

  return (
    <a
    href={href}
    onClick={onClick}>{children}</a>)
}
