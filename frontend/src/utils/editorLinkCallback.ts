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
const LOOKS_LIKE_EMAIL = /^[^\s@/]+@[^\s@/]+$/;

export const normalizeLinkTarget = (target: string): string => {
  const trimmed = (target || '').trim();

  if (!trimmed || HAS_SCHEME.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('#')) {
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
