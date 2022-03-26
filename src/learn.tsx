import { useRouter, Link } from './router'
import { Zoom, FenSheet, PianoKeys, NotesDurationTable } from './music'


const Learn = () => {

  let [route] = useRouter()

  return (
    <div class='learn'>
      <TableOfContents/>
      <div class='content'>
        <Dynamic component={route_components[route()]}/>
      </div>
    </div>
      )
}


const TableOfContents = () => {
  return (<div class='table-of-contents'>
      <div class='contents'>
        <TocSection i={1} title="Preface">
          Audience, Highlights
        </TocSection>
        <TocSection i={2} title="Introduction">
          Sound, Notation
        </TocSection>
        <TocSection i="A" title="References">
          Books, Videos
        </TocSection>

     </div>
      <h2> <span>Table Of</span>Contents</h2>
    </div>)
}

const TocSection = (props) => {
  let { i, title, children } = props

  return (<section>
      <h3>{i}</h3>
      <div>
        <Link href={"learn/"+title.toLowerCase()}>{title}</Link>
        {children}
      </div>
    </section>)
}

const PrefaceSection = () => {
  return (<Section title="Preface">
     Preface Hello
      </Section>)
}

const IntroductionSection = () => {
  return (<>
    <SoundSection/>
    <NotationSection/>
    </>)
}

const SoundSection = () => {
  return (<Section title="Sound"> 
<ul>
  <li> <StrongItem title="Pitch">highness or lowness of the sound, determined by frequency.</StrongItem></li>
  <li> <StrongItem title="Intensity">loudness of the sound, determined by amplitude, measured in decibels.</StrongItem></li>
  <li> <StrongItem title="Duration">length of time a pitch is sounded.</StrongItem></li>
  <li> <StrongItem title="Timbre">quality or color of the sound, different instruments have different timbre.</StrongItem></li>
</ul>
</Section>)
}

const NotationSection = () => {
  return (<Section title="Notation">
    <p><StrongItem title='The staff'>is five equally spaced horizontal lines.</StrongItem> </p>
    <Music zoom='3'/>
    <p><StrongItem title='Pitches'>are represented as symbols positioned on the staff.</StrongItem></p>
    <p>Pitches are referred to by the seven letters of the alphabet <strong>A B C D E F G</strong>.</p>
    <PianoKeys n={3}/>

    <p>Each key on a keyboard corresponds with a different pitch. The lowest pitch is on the far left, and each key to the right plays a successively higher pitch.</p>


    <p><StrongItem title='A clef'>is a symbol placed at the beginning of the staff. It assigns one of the lines or spaces on a staff to a specific pitch.</StrongItem></p>

    <p><StrongItem title='Treble clef or G clef'>symbol is a stylized G placed above middle C</StrongItem>. The curved line terminates at the second line designating the line as note G.</p>
    <Music zoom='3' fen={`{
/clef treble
g'"G" <a'"A" f'"F"> <b'"B" e'"E"> <c''"C" d'"D"> d''"D" e''"E" f''"F" g''"G" 
}`}/>

    <Subtitle> Different note pitches are placed on a G clef staff </Subtitle>

    <p><StrongItem title='Bass clef or F clef'>symbol is a stylized F. The dots are placed above and below the fourth line of staff, designating the line as an F.</StrongItem></p>
    <Music zoom='2' fen={`{
/clef bass
}`}/>

    <Subtitle> Bass clef notes are placed different than treble clef. (To be implemented) </Subtitle>


    <p>Together the treble and bass staves make a <strong>grand staff</strong>.</p>

    <p>The lines of the treble clef from bottom to top are <strong>E G B D and F</strong> or "Every Good Boy Deserves Fruit". The spaces from bottom to top are <strong>F A C and E</strong> or "F A C E".</p>


    <Music zoom='2' fen={`/new GrandStaff <<
{
/clef treble
<g'1 d"G"> <f'1 d"F"> <e'1 d"E"> <d'1 d"D"> <c'1 d"C" c'''"Middle C">
}
{
/clef bass
<d''1 d"F"> <e''1 d"G"> <f''1 d"A"> <g''1 d"B"> <a''1 d"C" e'''"Middle C">
}
>>`}/>

    <Subtitle> Notes go from Bass Cleff to Treble Cleff on a Grand Staff </Subtitle>

    <p>Pitches that go beyond the limits of the staff are written by adding <strong>ledger lines</strong> above or below the staff.</p>

    <Music zoom='2' fen={`{
/clef treble
<c'1 c"C"> <b1 c"B"> <a1 c"A"> <g1 c"G"> <f1 c"F"> <a''1 a"A"> <b''1 a"B"> <c'''1 a"C"> <d'''1 a"D"> <e'''1 a"E">
}`}/>

    <Subtitle> Notes with ledger lines </Subtitle>


		<p><StrongItem title='Accidentals'>are symbols that are placed to the left of the noteheads to indicate raising or lowering the pitch.</StrongItem></p>
		<ul>
		<li><StrongItem title='Sharp'>raises the pitch a half step.</StrongItem></li>
		<li><StrongItem title='Flat'>lowers the pitch a half step.</StrongItem></li>
		<li><StrongItem title='Natural'>cancels any previous sharp or flat and returns to the natural, unaltered pitch.</StrongItem></li>
		<li><StrongItem title='Double sharp, or double flat'>raises or lowers the pitch two half steps.</StrongItem></li>
		</ul>

    <small>The notion of step is discussed later.</small>

    <Music zoom='2' fen={`{
/clef treble
<gis'1 g"G Sharp"> <ges'1 g"G Flat"> <gisis'1 g"G Double Sharp"> <geses'1 g"G Double Flat">
}`}/>
    <Subtitle>A note can have sharps, flats or natural</Subtitle>



    <p><StrongItem title='An interval'>is the distance between two pitches.</StrongItem></p>
    <p>There are two useful intervals <strong>octave and semitone</strong>.</p>

    <p><StrongItem title='An Octave'>is the interval between a pitch and the next pitch above or below it with the same name.</StrongItem></p>
    <p>There are eight white keys between and including two pitches an octave apart.</p>

    <p><StrongItem title='A semitone'>is the interval between adjacent keys on the keyboard.</StrongItem></p>


    <p>The pattern of black and white keys repeats every octave on the keyboard. An octave is equal to 12 semitones (If you play all successive pitches between and including two pitches an octave apart, you would play 12 keys on the keyboard). Pitches an octave apart sound similar.</p>

    <p>The black keys on the keyboard, are named according to the adjacent white keys. Accidentals are used to indicate this adjacency. For example, black key between A and B can be referred to as A sharp or B flat.</p>

    <Music zoom='2' fen={`{
/clef treble
c'1 cis' d' dis' e' f' fis' g' gis' a' ais' b' c''
}`}/>

    <Subtitle>An octave of notes, increasing by a semitone.</Subtitle>


    <p><StrongItem title='Enharmonically equivalent'>names are when two different names refer to the same pitch.</StrongItem></p>
    <p>Sharps and flats are not exclusive to black keys. C is enharmonically equivalent to a B sharp, or E is enharmonically equivalent to an F flat.</p>

    <Music zoom='2' fen={`{
/clef treble
cis'1 des' aes' gis' ais' bes' ees'' dis'' eis' f' bis' c'' bis' deses''
}`}/>

    <Subtitle>Note that enharmonically equivalent notes sound the same.</Subtitle>




    <p>Accidentals apply to all other noteheads appearing on that line or space for the remainder of the measure, unless otherwise indicated. A natural accidental is used to cancel this convention.</p>

    <p>
      <small>Accidentals are closely related to key signatures that is discussed later. </small>
    </p>

    <h3>Duration, Meter and, Rhythm</h3>

    <p><StrongItem title='Meter and rhythm'>are patterns of duration.</StrongItem> Meter is regularly recurring pulses of equal duration, grouped in patterns of two, three, four etc. One of the pulses is accented, or strong. Pattern of strong and weak pulses are called <strong>beats</strong>. Duple (two beats) and triple (three beats) meter are two basic meters.</p>
    <p> <small>More on this later.</small></p>

    <p><StrongItem title='Rhythm'>is pattern of uneven durations.</StrongItem>
      Steady beats of a meter form <strong>measures</strong>, while rhythm can be any length.</p>

    <p>Each group of a meter is a <strong>measure or a bar</strong>. Vertical lines are <strong>measure lines or bar lines</strong>. Each measure is abbreviated as "m." and measures is abbreviated as "mm.".</p>

  <p>Music may start with a partial measure, called an <strong>anacrusis</strong>. It is not counted in the measure numbering.</p>

    <NotesDurationTable/>
 
    <Subtitle>The notation of duration for notes and rests</Subtitle>

    <p>One whole note lasts as long as two half notes. One half note lasts as long as two quarter notes etc.</p>

    <p>Symbols for quarter notes and eight notes differ by addition of the <strong>flag</strong> attached to the stem of the eight note. Shorter durations can be written by adding more flags to the stem. Each additional flag divides the previous duration in half.</p>

    <p>Notes with flags are sometimes connected by <strong>beams</strong>. For clarifying the meter of the piece, and easier reading. Note that different durations can be beamed together as well.</p>

    <p>To express wider variety of rhthms, for example half a note followed by three quarter notes, we can use <strong>dots and ties</strong></p>

    <p><StrongItem title='A tie'>is a curved line that connects two adjacent notes, with the same pitch, that sounds as single sound duration of both note values.</StrongItem></p>

    <Music zoom='2' fen={`{
/clef treble
c''~ c''4 | c''2
}`}/>

    <Subtitle>Tied quarter notes are equal to the half note</Subtitle>




    <p><StrongItem title='A dot'>is placed right of a note head. It lengthens the value of the note by half of it's note value.</StrongItem>
      A dotted quarter note is equal to a regular quarter note plus an eight note. Rests can be dotted as well. 
			<StrongItem title='A double dotted note'>the second dot adds half of the value added by the first note.</StrongItem></p>


    <Music zoom='2' fen={`{
/clef treble
a'2. | a'2~ a'4
}`}/>

    <Subtitle>Tied quarter notes are equal to the half note</Subtitle>


    <p>Ties can be confused with <strong>slurs</strong>. <StrongItem title='A slur'>is similar to a tie except it connects different pitches.</StrongItem> Rests cannot be tied.</p>

    <p><StrongItem title='Meter'>is how beats are organized.</StrongItem> A meter that puts beats in groups of two is <strong>duple meter</strong> or in groups of three is <strong>triple meter</strong> and in groups of four is <strong>quadruple meter</strong>.</p>

    <p>A beat can also be divided. Each quarter note beat can be divided into two eight notes.
      Meters that divide the beat into twos are called <strong>simple meters</strong>.
      Meters that divide the beat into threes are called <strong>compound meters</strong>.</p>


    <p>For example a measure is divided in two beats thus duple meter, and each beat is divided into two, thus simple meter, or <strong>simple duple meter</strong>.
      A measure divided in two beats thus simple, each beat is divided into three thus compound, is <strong>simple compound meter</strong>.</p>

    <p>Some music may start with an incomplete or partial measure, that is called anacrusis or <strong>pickup measure</strong>.</p>


    <p><StrongItem title='Time signature'>is pair of large numbers at the beginning of the first line of staff. They indicate the meter of the music.</StrongItem>
      The meter may change in between measures, new meter is indicated by a new time signature.
      </p>


    <Music zoom='2' fen={`{
/clef treble
/time 2/2 
|| 
/time 3/2 
|| 
/time 4/2 
|| 
/time 3/4 
|| 
/time 4/4 
|| 
/time 6/8 
|| 
/time 9/8 
|| 
/time 12/8 
}`}/>

    <Subtitle> Time signatures with 6 simple meter and 3 compound meter. </Subtitle>


      

    <p>Any time signature where the top number is 2, 3, or 4 is a <strong>simple meter</strong>.
      For simple meters, top number indicates the number of beats per measure (duple, triple, or quadruple), and bottom number indicates the beat value.
      In a time signature of 3/4, 3 indicates that there are three beats per measure, and 4 indicates that each beat is the length of a quarter note.
      C is a time signature shorthand for 4/4 or <strong>common time</strong>.
      C/ is a time signature shorthand for 2/2 or <strong>cut time</strong>.</p>

      <Music zoom='2' fen={`{
/clef treble
/time 3/4
<b' b''"Beats" a"1"> <b' a"2"> <b' a"3"> | <b'8 b''"Beats divided" a"1"> b'8 <b'8 a"2"> b'8 <b'16 b''"Beats subdivided" a"3"> b'16 b'16 b'16

} {
/clef treble
/time 3/2
<b'2 b''"Beats" a"1"> <b'2 a"2"> <b'2 a"3"> | <b'4 b''"Beats divided" a"1"> b'4 <b'4 a"2"> b'4 <b'8 a"3"> b'8 b'8 b'8
}`}/>

// TODO REST

    <Subtitle> First measure, a full note for each beat, and next measure, beats are divided and further subdivided </Subtitle>


    <p>For <strong>compound meters</strong> beat is divided into three equal durations. Each beat is a dotted note.
      The upper numbers are usually 6, 9 and, 12.
      In a time signature of 6/8, 8 indicates each beat is equal to a dotted quarter note, each measure has six eight notes, each beat is divided into three eight notes that is a dotted quarter note.
      To find the number of beats per measure, divide the top number by three. Thus 6/8 is duple meter, 9/8 is triple meter, 12/8 is quadruple meter.
      Since the bottom number indicates the duration of the beat division, add three of the bottom number to get the beat duration.
      In case of 6/8, the beat duration is three of eight notes which add up to a dotted quarter note. The beat duration (or unit) of a compound meter is always a dotted note.</p>



    <p><StrongItem title='Tuplets'>is a generic term for rhythmic alteration.</StrongItem>
      It can be a <strong>triplet or a duplet</strong>.
      A triplet represents, a ryhthmic borrowing from, (or a temporary shift to) the compound meter. A duplet is rythmic borrowing from the simple meter.
      For example in 3/4, beat can be divided into two eight notes. In 9/8, each beat can be divided into three eight notes. In 3/4, a triplet squeeze three eight notes into a  beat as if it was 9/8.
      A duplet alters the ryhthm so that two notes take up the space that would normally accomodate three.</p>
 </Section>)
}


const ReferencesSection = () => {
  return (<Section title="References"> 
  <ul>
    <li><a href="https://milnepublishing.geneseo.edu/fundamentals-function-form/">Fundamentals, Function, and Form - Theory and Analysis of Tonal Western Art Music by Andre Mount</a></li>
    <li><span>Music in Theory and Practice Volume 1 10th Edition by Bruce Benward</span></li>
    <li><span>The Complete Musician An Integrated Approach to Theory, Analysis, and Listening Fourth Edition by Steven G. Laitz</span></li>
    <li><a href="https://www.youtube.com/watch?v=ICDPWP6HUbk&list=PLw9t0oA3fHkxx1PgYpiXrMUPXaOiwh6KU">Dr. B Music Theory Lesson Youtube Playlist</a></li>
  </ul>
</Section>)
}

const Music = (props) => {
  return (<Zoom zoom={props.zoom}>
    <FenSheet fen={props.fen}/>
    </Zoom>)
}

const default_learn_route = 4

const route_components = [undefined, undefined, undefined, undefined, undefined, 
 PrefaceSection,
 IntroductionSection,
 ReferencesSection
]



const Subtitle = (props) => {
  return (<p class='subtitle'>{props.children}</p>)
}

const StrongItem = (props) => {
  return (<> <strong>{props.title}</strong> {props.children} </>)
}

const Section = (props) => {
  return (<section>
        <h2>{props.title}</h2>
        {props.children}
      </section>)
}

export default Learn
