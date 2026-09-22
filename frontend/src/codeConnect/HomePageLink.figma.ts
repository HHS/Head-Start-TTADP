// url=https://www.figma.com/design/LNF1ux5pEABIOD10T2oBUP/Landing-page?node-id=720-57116
// source=src/pages/Home/components/HomePageLink.tsx
// component=HomePageLink

/**
 * Figma Code Connect template (v2) for the homepage "Widget" component.
 *
 * Published component node-id 720:57116, read from Figma on 2026-09-21.
 * The Figma component has no exposed component properties, so the template
 * reads its three configurable text descendants. Destinations, icons, and
 * external-link behavior remain application-owned values. The example accepts
 * those values as typed inputs instead of inventing a URL or icon mapping.
 *
 * The landing-page frame also uses a second Widget component whose returned
 * source node-id (1275:67878) is not currently inspectable through Figma's
 * Code Connect context API. That component is intentionally not guessed here.
 */

import figma from 'figma';

const instance = figma.selectedInstance;
const title = instance.findText('Value').textContent;
const description = instance.findText('View profile and My Groups').textContent;
const linkLabel = instance.findText('Button', { traverseInstances: true }).textContent;

export default {
  id: 'HomePageLink',
  imports: [
    "import HomePageLink, { type HomePageLinkProps } from './pages/Home/components/HomePageLink';",
  ],
  example: figma.code`function HomepageShortcut({ destination, icon, external }: Pick<HomePageLinkProps, 'destination' | 'icon' | 'external'>) {
  return <HomePageLink${figma.helpers.react.renderProp('title', title)}${figma.helpers.react.renderProp('description', description)}${figma.helpers.react.renderProp('linkLabel', linkLabel)} destination={destination} icon={icon} external={external} />;
}`,
  metadata: { nestable: true },
};
