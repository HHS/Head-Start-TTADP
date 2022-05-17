#!/bin/bash

currentJsHash=$(cat colorsjschecksum)
currentScssHash=$(cat colorsscsschecksum)
newJsChecksum="$(sha256sum frontend/src/colors.js | cut -f1 -d' ')"
newScssChecksum="$(sha256sum frontend/src/colors.scss | cut -f1 -d' ')"

if [ "$currentJsHash" != "$newJsChecksum" ]; then
  echo 'Error. Javascript hash does not match \n'
  echo 'Please run yarn makecolors or yarn docker:makecolors'
  echo 'so that your colors are updated in all the right places'
  exit 1
fi

echo $currentScssHash
echo $newScssChecksum

if [ "$currentScssHash" != "$newScssChecksum" ]; then
  echo 'Error. SCSS hash does not match \n'
  echo 'Please run yarn makecolors or yarn docker:makecolors'
  echo 'so that your colors are updated in all the right places'
  exit 1
fi

exit 0