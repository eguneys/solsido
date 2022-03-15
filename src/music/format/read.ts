import * as mm from './matchers'
import tamcher from 'tamcher'

import { Music, ignores, ids, model as to_model } from './model'

import { tt, model } from 'tamcher'


function mrLeaf(rmv: tt.OneMatcherNode, mv: string): tt.Maybe<model.ModelRef> {
  if (ignores.includes(rmv.tpe)) {
    return
  }
  if (ids.includes(rmv.tpe)) {
    return {
      [rmv.tpe]: mv
    }
  }
}

function mrBranch(rmv: tt.OneMatcherNode, children: Array<model.ModelRef>): tt.Maybe<model.ModelRef> {
  return {
    [rmv.tpe]: children
  }
}

function reducer(rmv: tt.OneMatcherValue,
                 mv: tt.OneMatcherValue,
                 children: Array<model.ModelRef>): tt.Maybe<model.ModelRef> {

                   let cFlat = children.filter(Boolean) as Array<model.ModelRef>

                   if (rmv === 'rootroot') {
                     return cFlat
                   }

                   if (typeof mv === 'string') {
                     if (typeof rmv === 'string') {

                     } else if (Array.isArray(rmv)) {
                       return cFlat
                     } else {
                       return mrLeaf(rmv, mv)
                     }
                   } else if (Array.isArray(mv)) {
                     if (typeof rmv === 'string') {
                       return cFlat
                     } else if (Array.isArray(rmv)) {
                       return cFlat
                     } else {
                       return mrBranch(rmv, cFlat)
                     }
                   } else {
                     if (typeof rmv === 'string') {
                       return cFlat[0]
                     } else if (Array.isArray(rmv)) {
                       return cFlat[0]
                     } else {
                       return mrBranch(rmv, cFlat)
                     }
                   }
                 }

export default function read_fen(str: string): Music | undefined {
  let res = mm.mMusic(str)

  if (res) {
    console.log(to_model(tamcher(res, reducer)))
    return to_model(tamcher(res, reducer))
  }
}
