import { ticks } from './shared'

let RE = /^[A-Za-z0-9\+\-;'\\\[\]]$/
let RE2 = /^(\s|Shift|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Enter|Tab|\*)$/
let RE3 = /^(\!|\$)$/
function capture_key(key: string) {
  return key.match(RE) || key.match(RE2) || key.match(RE3)
}

function appr(value: number, target: number, dt: number)  {
  if (value < target) {
    return Math.min(value + dt, target)
  }else {
    return Math.max(value - dt, target)
  }
}

type ButtonState = {
  just_pressed: boolean,
  just_released: boolean,
  ctrl: boolean,
  shift: boolean,
  t: number,
  t0: number
}


export default class Input {


  get left() {
    return this.btn('left')
  }

  get right() {
    return this.btn('right')
  }


  _btn = new Map<string, ButtonState>()

  _last_released?: string
  _btnpp?: string

  private press = (key: string, e: KeyEvent) => {
    
    let ctrl = e.ctrlKey,
      shift = e.shiftKey

    if (!this._btn.has(key)) {
      this._btn.set(key, {
        just_pressed: true,
        just_released: false,
        ctrl,
        shift,
        t: 0,
        t0: 0
      })
      return
    }
    this._btn.get(key)!.just_pressed = true
  }


  private release = (key: string) => {
    let res = this._btn.get(key)
    if (res) {
      res.just_released = true
    }
  }

  btn = (key: string, shift?: boolean, ctrl?: boolean) => {
    let btn = this._btn.get(key)

    if (btn && !!shift === !!btn.shift) {
      return btn.t
    } else {
      return 0
    }
  }

  btn0 = (key: string, shift?: boolean, ctrl?: boolean) => {
    let btn = this._btn.get(key)

    if (btn && !!shift === !!btn.shift) {
      return btn.t0
    } else {
      return 0
    }
  }


  btnp = (key: string, shift?: boolean, ctrl?: boolean) => {
    return this.btn(key, shift, ctrl) > 0 && this.btn0(key, shift, ctrl) === 0
  }

  btnpp = (key: string) => {
    return this._btnpp === key
  }

  update = (dt: number, dt0: number) => {

    this._btnpp = undefined

    for (let [key, s] of this._btn) {
      if (s.t === 0) {
        s.t0 = s.t
      }
      if (s.just_pressed || s.t > 0) {
        s.t0 = s.t
        s.t += dt
        s.just_pressed = false
      }

      if (s.just_released) {
        s.t0 = s.t
        s.t = 0
        s.just_released = false

        if (this._last_released && this._last_released === key) {
          this._btnpp = key
          this._last_released = undefined
        } else {
          this._last_released = key
        }
      }
    }
  }

  init() {

    let { press, release } = this

    document.addEventListener('keydown', e => {
      if (e.ctrlKey || !capture_key(e.key)) {
        return
      }
      e.preventDefault()
      switch(e.key) {
        case 'ArrowUp':
          press('up', e);
          break;
        case 'ArrowDown':
          press('down', e);
          break;
        case 'ArrowLeft':
          press('left', e);
          break;
        case 'ArrowRight':
          press('right', e);
          break;
        default:
          press(e.key, e)
          break
      }
    });

    document.addEventListener('keyup', e => {
      if (e.ctrlKey || !capture_key(e.key)) {
        return
      }
      e.preventDefault()
      switch(e.key) {
        case 'ArrowUp':
          release('up');
          break;
        case 'ArrowDown':
          release('down');
          break;
        case 'ArrowLeft':
          release('left');
          break;
        case 'ArrowRight':
          release('right');
          break;
        default:
          release(e.key)
          break
      }
    });

    return this
  }
}
