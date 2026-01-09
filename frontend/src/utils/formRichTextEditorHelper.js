/* eslint-disable import/prefer-default-export */
/**
 * Utilities for handling rich text editor behavior in forms.
 *
 * This module provides helper functions to manage the interaction between
 * rich text editors (react-draft-wysiwyg) and React Hook Form's autosave functionality.
 */

/**
 * Checks if the form data should be updated based on whether
 * the user is actively editing a rich text editor.
 *
 * During autosave, we don't want to reset the form (via React Hook Form's reset())
 * if the user's cursor is currently in a rich text editor, as this would cause
 * focus loss and cursor position reset, disrupting the user's editing experience.
 *
 * This function checks if the current document selection (cursor position) is
 * within any rich text editor on the page by querying for the `.rdw-editor-main`
 * class, which is the container element for react-draft-wysiwyg editors.
 *
 * @param {boolean} isAutoSave - Whether this is an autosave operation
 * @returns {boolean} - True if form can be updated, false if user is actively editing
 *
 * @example
 * // In a save handler
 * const onSave = async (isAutoSave = false) => {
 *   const savedData = await saveToBackend();
 *   const allowUpdateForm = shouldUpdateFormData(isAutoSave);
 *   if (allowUpdateForm) {
 *     reset(savedData);
 *   }
 * };
 */
export const shouldUpdateFormData = (isAutoSave) => {
  // Manual saves should always update form data
  if (!isAutoSave) {
    return true;
  }

  // Check if cursor is currently in any rich text editor
  const richTextEditors = document.querySelectorAll('.rdw-editor-main');
  const selection = document.getSelection();

  // Return false (don't update) if cursor is within a rich text editor
  return !(Array.from(richTextEditors).some((rte) => rte.contains(selection.anchorNode)));
};
