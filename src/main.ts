import { render } from 'solid-js/web'

import App from './view'

type Config = {}

export default function Solsido(element: HTMLElement, config: Config) {
  render(App, element)
}
