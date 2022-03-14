const gclef = ''
const bclef = ''

const double_note = ''
const whole_note = ''
const half_note = ''
const quarter_note = ''
const brace = ''

const flat_accidental = ''
const natural_accidental = ''
const sharp_accidental = ''

const eighth_flag_up = ''
const sixteenth_flag_up = ''
const thirtysecond_flag_up = ''
const sixtyfourth_flag_up = ''

const eighth_flag_down = ''
const sixteenth_flag_down = ''
const thirtysecond_flag_down = ''
const sixtyfourth_flag_down = ''

const whole_rest = ''
const half_rest = ''
const quarter_rest = ''
const eighth_rest = ''
const sixteenth_rest = ''
const thirtysecond_rest = ''
const sixtyfourth_rest = ''
const onetwentyeighth_rest = ''

const zero_time = ''
const one_time = ''
const two_time = ''
const three_time = ''
const four_time = ''
const five_time = ''
const six_time = ''
const seven_time = ''
const eight_time = ''
const nine_time = ''
const ten_time = one_time + zero_time
const twelve_time = one_time + two_time


const quarter_text = ''

export type GlyphMap = {
  [key: string]: string
}

export default {
  quarter_text,
  gclef,
  bclef,
  double_note,
  whole_note,
  half_note,
  quarter_note,
  flat_accidental,
  natural_accidental,
  sharp_accidental,
  eighth_flag_down,
  sixteenth_flag_down,
  thirtysecond_flag_down,
  sixtyfourth_flag_down,
  eighth_flag_up,
  sixteenth_flag_up,
  thirtysecond_flag_up,
  sixtyfourth_flag_up,
  brace,
  whole_rest,
  half_rest,
  quarter_rest,
  eighth_rest,
  sixteenth_rest,
  thirtysecond_rest,
  sixtyfourth_rest,
  onetwentyeighth_rest,
  zero_time,
  one_time,
  two_time,
  three_time,
  four_time,
  five_time,
  six_time,
  seven_time,
  eight_time,
  nine_time,
  ten_time,
  twelve_time,
} as GlyphMap
