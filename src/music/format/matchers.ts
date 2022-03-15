import { mm, rr } from 'tamcher'


export const mSpaceStar = mm.mr(/^( +)(.*)$/s, 'space')
export const mSpace = mm.mr(/^( )(.*)$/s, 'newline')
export const mNewline = mm.mr(/^(\n)(.*)$/s, 'newline')
export const mSlash = mm.mr(/^(\/)(.*)$/s, 'slash')
export const mWord = mm.mr(/^([a-zA-Z]+)(.*)$/s, 'word')

export const mQuote = mm.mr(/^(\")(.*)$/s, 'quote')

export const mChordBegin = mm.mr(/^(\<)(.*)$/s, 'quote')
export const mChordEnd = mm.mr(/^(\>)(.*)$/s, 'quote')

export const mRest = mm.mr(/^([r])(.*)$/s, 'r')
export const mPitch = mm.mr(/^([abcdefg])(.*)$/s, 'pitch')
export const mOctave = mm.mr(/^([\'])(.*)$/s, 'octave')
export const mOctaveDown = mm.mr(/^([\,])(.*)$/s, 'octave_down')

/* https://stackoverflow.com/questions/71474211/how-to-match-some-specific-one-digit-numbers-or-two-digit-numbers?noredirect=1#comment126330449_71474211 */
export const mDuration = mm.mr(/^([1248])(.*)$/s, 'duration')

export const mQuotedText = mm.mseq3([
  mQuote,
  mWord,
  mQuote
], rr.fSecond('text'))

export const mWithPitchOctave = mm.mseq3([
  mm.meither([mRest, mPitch]),
  mm.mOpt(mm.mgroup(mm.mstar(mm.meither([mOctave, mOctaveDown])), mm.oneMatcherNode('octaves'))),
  mm.meither([
    mDuration,
    mQuotedText
  ])
], rr.fAll('wPO'))

export const mNotes = mm.mstar(mm.meither([
  mWithPitchOctave,
  mSpace
]))

export const mChord = mm.mseq3([
  mChordBegin,
  mNotes,
  mChordEnd
], rr.fSecond('chord'))


export const mChordOrNotes = mm.mstar(mm.meither([
  mNotes,
  mChord
]))

export const mCommand = mm.mgroup(mm.mseq3([
  mm.mOpt(mSpaceStar),
  mm.mseq3([
    mSlash,
    mWord,
    mm.mseq3([
      mSpace,
      mWord,
      mm.mpass,
    ], mm.fSecond)
  ], _ => _.slice(1)),
  mm.mOpt(mSpaceStar),
], mm.fSecond), mm.oneMatcherNode('command'))


/*
{
/clef treble
g'"G"
}
*/
export const mStaff =
  mm.mseq3([
    mm.mr(/^(\{)(.*)$/s, 'sbegin'),
    mm.mstar(mm.meither([mNewline, mCommand, mChordOrNotes])),
    mm.mr(/^(\})(.*)$/s, 'send')], rr.fSecond('staff'))


export const mMusic = mm.meither([
  mStaff
])


