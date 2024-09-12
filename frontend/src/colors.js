// if adding to this, please run 'yarn makecolors' from the root dir or if you are using docker,
// yarn docker:makecolors from the root directory
// to rebuild the matching colors.scss file
// (the colors variables are used in two ways, inlined in javascript and directly in css
// to keep things consistent, we update only in one place - the colors.js file, and use
// yarn makecolors to keep the files identical)

const colors = {
  ttahubBlue: '#264a64',
  ttahubMediumBlue: '#336A90',
  ttahubBlueLight: '#e2eff7',
  ttahubBlueLighter: '#eceef1',
  ttahubMediumDeepTeal: '#407972',
  ttahubDeepTealLight: '#EEF2EB',
  ttahubMagenta: '#A12854',
  ttahubMagentaLight: '#ffe8f0',
  ttahubOrange: '#e29f4d',
  ttahubOrangeLight: '#fff1e0',

  baseDarkest: '#1b1b1b',
  baseDark: '#565c65',
  baseLight: '#a9aeb1',
  baseLighter: '#dfe1e2',
  baseLightest: '#f0f0f0',
  grayTwo: '#f9f9f9',

  info: '#00bde3',
  infoLighter: '#e7f6f8',
  success: '#00a91c',
  successLighter: '#ecf3ec',
  successDarker: '#00a91c',
  successDarkest: '#008817',
  error: '#d54309',
  errorLighter: '#f4e3db',

  warning: '#ffbe2e',
  warningLighter: '#faf3d1',
  errorDark: '#b50909',
  blueVividFocus: '#2491FF',

  textInk: '#1b1b1b',
  textLink: '#46789B',
  textVisited: '#8C39DB',
  responseCode: '#71767A',
};

module.exports = colors;
