import { index_white, index_black } from './music/piano'

export const getKeyAtDomPos = (epos: NumberPair, bounds: ClientRect, key_xys: [Array<NumberRect>, Array<NumberRect>]) => {
  let x = epos[0] - bounds.left,
    y = epos[1] - bounds.top


  let [bxys, wxys] = key_xys

  let b_key = bxys.findIndex(_ => point_in_rect(_, x, y))
  if (b_key >= 0) {
    return index_black(b_key)
  }

  let w_key = wxys.findIndex(_ => point_in_rect(_, x, y))

  return index_white(w_key)
}



export const eventPosition = (e: MouchEvent): NumberPair | undefined => {
  if (e.clientX || e.clientX === 0) return [e.clientX, e.clientY!];
  if (e.targetTouches?.[0]) return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
  return;
};

export const point_in_rect = (rect: NumberRect, x: number, y: number) => {
  let [_x, _y, w, h] = rect
  let _x2 = _x + w,
    _y2 = _y + h

  return _x <= x && x < _x2 && _y <= y && y < _y2
}

