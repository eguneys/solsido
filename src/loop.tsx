import { useContext, createContext, createSignal } from 'solid-js'  
import Input from './input'

class Timer {
 dt: number;
 dt0: number;
}

const AppContext = createContext()

export const useApp = () => { return useContext(AppContext) }

export const AppProvider = (props) => {
  
  let [input, setInput] = createSignal(new Input().init(), { equals: false })
  let [timer, setTimer] = createSignal(new Timer(), { equals: false })

  let fixed_dt = 1000/60
  let timestamp0: number | undefined,
  min_dt = fixed_dt,
    max_dt = fixed_dt * 2,
    dt0 = fixed_dt

  let elapsed = 0
  function step(timestamp: number) {

    let dt = timestamp0 ? timestamp - timestamp0 : fixed_dt

    dt = Math.max(min_dt, dt)
    dt = Math.min(max_dt, dt)

    setInput(input => { 
      input.update(dt, dt0)
      return input
    })
    //mouse.update(dt, dt0)
    //

    setTimer(timer => {
      timer.dt = dt
      timer.dt0 = dt0
      return timer
    })

    dt0 = dt 
    timestamp0 = timestamp
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step) 
 

  let store = [
    input,
    timer
  ]

  return (<AppContext.Provider value={store}>
      {props.children}
    </AppContext.Provider>)
}
