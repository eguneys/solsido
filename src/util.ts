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

