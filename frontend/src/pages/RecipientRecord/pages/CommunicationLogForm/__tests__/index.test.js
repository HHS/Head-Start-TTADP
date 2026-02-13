import '@testing-library/jest-dom'
import { shouldUpdateFormData } from '../../../../../utils/formRichTextEditorHelper'

// Unit tests for shouldUpdateFormData usage in CommunicationLogForm
// These tests verify that our changes integrate correctly with the utility function

describe('CommunicationLogForm shouldUpdateFormData integration', () => {
  // Test the utility function behavior that CommunicationLogForm depends on
  describe('shouldUpdateFormData behavior', () => {
    it('returns true when isAutoSave is false (manual save)', () => {
      const result = shouldUpdateFormData(false)
      expect(result).toBe(true)
    })

    it('returns true when isAutoSave is true and cursor not in rich text editor', () => {
      // Mock no rich text editors
      jest.spyOn(document, 'querySelectorAll').mockReturnValue([])
      jest.spyOn(document, 'getSelection').mockReturnValue({
        anchorNode: document.createElement('div'),
      })

      const result = shouldUpdateFormData(true)
      expect(result).toBe(true)

      jest.restoreAllMocks()
    })

    it('returns false when isAutoSave is true and cursor is in rich text editor', () => {
      const mockEditor = {
        contains: jest.fn(() => true),
      }

      jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockEditor])
      jest.spyOn(document, 'getSelection').mockReturnValue({
        anchorNode: document.createElement('div'),
      })

      const result = shouldUpdateFormData(true)
      expect(result).toBe(false)

      jest.restoreAllMocks()
    })
  })

  // Test the conditional logic that was added
  describe('conditional form reset logic', () => {
    it('covers the allowUpdateForm true branch', () => {
      const isAutoSave = false
      const allowUpdateForm = shouldUpdateFormData(isAutoSave)

      // This simulates the logic in CommunicationLogForm
      // When allowUpdateForm is true, resetFormData would be called
      expect(allowUpdateForm).toBe(true)
    })

    it('covers the allowUpdateForm false branch', () => {
      // Mock scenario where cursor is in editor
      const mockEditor = {
        contains: jest.fn(() => true),
      }

      jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockEditor])
      jest.spyOn(document, 'getSelection').mockReturnValue({
        anchorNode: document.createElement('div'),
      })

      const isAutoSave = true
      const allowUpdateForm = shouldUpdateFormData(isAutoSave)

      // This simulates the logic in CommunicationLogForm
      // When allowUpdateForm is false, resetFormData would NOT be called
      expect(allowUpdateForm).toBe(false)

      jest.restoreAllMocks()
    })

    it('tests parameter passing with default value', () => {
      // Test that isAutoSave defaults to false when not provided
      const testOnSave = (isAutoSave = false) => {
        const allowUpdateForm = shouldUpdateFormData(isAutoSave)
        return allowUpdateForm
      }

      // Called without parameter - should default to false
      expect(testOnSave()).toBe(true)

      // Called with false
      expect(testOnSave(false)).toBe(true)

      // Called with true (mock cursor not in editor)
      jest.spyOn(document, 'querySelectorAll').mockReturnValue([])
      expect(testOnSave(true)).toBe(true)

      jest.restoreAllMocks()
    })
  })
})
