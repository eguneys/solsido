import { mm, rr } from 'tamcher'


export const mSpaceStar = mm.mr(/^( +)(.*)$/s, 'space')
export const mSpace = mm.mr(/^( )(.*)$/s, 'newline')
export const mNewline = mm.mr(/^(\n)(.*)$/s, 'newline')
export const mSlash = mm.mr(/^(\/)(.*)$/s, 'slash')
export const mWord = mm.mr(/^([a-zA-Z]+)(.*)$/s, 'word')

export const mWordPlus = mm.mr(/^([a-zA-Z0-9\/]+)(.*)$/s, 'word')

export const mText = mm.mr(/^([a-z|A-Z|0-9| ]+)(.*)$/s, 'word')

export const mQuote = mm.mr(/^(\")(.*)$/s, 'quote')

export const mChordBegin = mm.mr(/^(\<)(.*)$/s, 'quote')
export const mChordEnd = mm.mr(/^(\>)(.*)$/s, 'quote')

export const mRest = mm.mr(/^([r])(.*)$/s, 'r')
export const mPitch = mm.mr(/^([abcdefg])(.*)$/s, 'pitch')
export const mOctave = mm.mr(/^([\'])(.*)$/s, 'octave')
export const mOctaveDown = mm.mr(/^([\,])(.*)$/s, 'octave_down')

export const mAccidental = mm.mr(/^([ie]s)(.*)$/s, 'accidental')

export const mTie = mm.mr(/^(\~)(.*)$/s, 'tie')

export const mBar = mm.mr(/^(\|)(.*)$/s, 'bar')
export const mDoubleBar = mm.mr(/^(\|\|)(.*)$/s, 'dbar')

export const mDot = mm.mr(/^(\.)(.*)$/s, 'dot')

/* https://stackoverflow.com/questions/71474211/how-to-match-some-specific-one-digit-numbers-or-two-digit-numbers?noredirect=1#comment126330449_71474211 */
export const mDurationNumber = mm.mr(/^([1248])(.*)$/s, 'duration_number')
export const mDurationNumber2 = mm.mr(/^(16)(.*)$/s, 'duration_number')

export const mQuotedText = mm.mseq3([
  mQuote,
  mText,
  mQuote
], rr.fSecond('text'))

export const mDuration = mm.mseq3([
  mm.meither([mDurationNumber2, mDurationNumber]),
  mm.mpass,
  mm.mOpt(mDot)
], rr.fOneAndThree('duration'))

export const mWithPitchOctave = mm.mseq3([
  mm.meither([mRest, mPitch]),
  mm.mseq3([
    mm.mOpt(mAccidental), 
    mm.mOpt(mAccidental),
    mm.mOpt(mm.mgroup(mm.mstar(mm.meither([mOctave, mOctaveDown])), mm.oneMatcherNode('octaves'))),
  ], rr.fAll('accidentals_octave')),
  mm.mseq3([
    mm.mOpt(mm.meither([
      mDuration,
      mQuotedText
    ])),
    mm.mpass,
    mm.mOpt(mTie)
  ], rr.fOneAndThree('duration_ties'))
], rr.fAll('wPO'))

export const mNotes = mm.mstar(mm.meither([
  mWithPitchOctave,
  mSpace
]))

export const mNotesOrBars = mm.mstar(mm.meither([
  mWithPitchOctave,
  mDoubleBar,
  mBar,
  mSpace
]))

export const mChord = mm.mseq3([
  mChordBegin,
  mNotes,
  mChordEnd
], rr.fSecond('chord'))

export const mCommand = mm.mgroup(mm.mseq3([
  mm.mOpt(mSpaceStar),
  mm.mseq3([
    mSlash,
    mWord,
    mm.mseq3([
      mSpace,
      mWordPlus,
      mm.mpass,
    ], mm.fSecond)
  ], _ => _.slice(1)),
  mm.mOpt(mSpaceStar),
], mm.fSecond), mm.oneMatcherNode('command'))


export const mChordOrNotes = mm.mstar(mm.meither([
  mNotesOrBars,
  mChord
]))


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

export const mStaffs = mm.mgroup(mm.mstar(mm.meither([mStaff, mSpace, mNewline])), mm.oneMatcherNode('staffs'))

export const mMusic = mm.meither([
  mStaffs
])


