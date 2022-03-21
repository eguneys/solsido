import { Adsr } from './audio/player'


export type Synthe = {
  amp_envelope: Adsr,
  cutoff_envelope: Adsr,
  amplitude: number,
  cutoff: number,
  cutoff_max: number
}
