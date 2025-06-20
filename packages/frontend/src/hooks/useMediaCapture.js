import { useCallback } from 'react';
import moment from 'moment';
import html2canvas from 'html2canvas';

export default function useMediaCapture(reference, title = 'download') {
  const capture = useCallback(async () => {
    try {
      // capture the element, setting the width and height
      // we just calculated, and setting the background to white
      // and then converting it to a data url
      // and triggering a download
      const today = moment().format('YYYY-MM-DD');
      const canvas = await html2canvas(reference.current, {
        onclone: (_document, element) => {
          // set the first child to be white (we can always make this configurable later)
          element.firstChild.classList.add('bg-white');

          // make sure we get the entire element and nothing is cut off
          element.classList.remove('overflow-x-scroll');
        },
      });
      const base64image = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = base64image;
      a.setAttribute('download', `${today}-${title}.png`);
      a.click();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  }, [reference, title]);

  return capture;
}
