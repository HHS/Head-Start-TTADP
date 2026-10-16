// react-draft-wysiwyg's default link callback runs the URL through a copy of
// linkify-it@2 bundled into its dist build, which has known quadratic-time
// advisories and can't be patched with a resolution. Passing this as
// `toolbar.link.linkCallback` keeps that bundled code from ever running.

export interface EditorLinkParams {
  title: string;
  target: string;
  targetOption: string;
}

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const HOST_AND_PORT = /^([^\s/:?#@]+):\d+(?:[/?#]|$)/;
const LOOKS_LIKE_EMAIL = /^[^\s@/]+@[^\s@/]+$/;

// "example.com:8080/path" also matches HAS_SCHEME, so check for a host and
// port first. Requiring a dot (or localhost) keeps "tel:5551234" a scheme.
const isHostAndPort = (value: string): boolean => {
  const match = HOST_AND_PORT.exec(value);
  if (!match) {
    return false;
  }
  const host = match[1];
  return host.includes('.') || host.toLowerCase() === 'localhost';
};

export const normalizeLinkTarget = (target: string): string => {
  const trimmed = (target || '').trim();

  if (!trimmed || trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }

  if (isHostAndPort(trimmed)) {
    return `http://${trimmed}`;
  }

  if (HAS_SCHEME.test(trimmed)) {
    return trimmed;
  }

  if (LOOKS_LIKE_EMAIL.test(trimmed)) {
    return `mailto:${trimmed}`;
  }

  // Match the default callback, which prefixes scheme-less links with http://
  return `http://${trimmed}`;
};

const editorLinkCallback = (params: EditorLinkParams): EditorLinkParams => ({
  ...params,
  target: normalizeLinkTarget(params.target),
});

export default editorLinkCallback;
