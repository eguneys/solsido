#!/bin/bash

ROUTES="home sound music learn/index learn/preface learn/introduction learn/notation learn/references"
cd dist
mkdir learn
for f in $ROUTES 
do
  echo $f.html
  cp index.html $f.html
done
