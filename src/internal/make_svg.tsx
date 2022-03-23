import './internal.css'

export function tie_path(x) {
  return `M 0 ${x*0.5} c ${x} -${x*0.5}    ${x*4} -${x*0.5}    ${x*5} 0
                    -${x} -${x*0.5-4} -${x*4} -${x*0.5-4} -${x*5} 0`
}

export default () => {


  return (<div class="svg">
     <svg>
      <path class="TieSegment" stroke="#000" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd" d="
M 0 34 c 123 -34 495 -34 619 0 -123 -30 -495 -30 -619 0"/>
      </svg>

     <svg>
      <path class="TieSegment" stroke="#000" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd" d={tie_path(44)}/>
      </svg>
     <svg>
      <path class="TieSegment" stroke="#000" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd" d={tie_path(34)}/>
      </svg>

     <svg>
      <path class="TieSegment" stroke="#000" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd" d={tie_path(24)}/>
      </svg>
     <svg>
      <path class="TieSegment" stroke="#000" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill-rule="evenodd" d={tie_path(14)}/>
      </svg>
      </div>)
}
