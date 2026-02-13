import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'
import React from 'react'
import { shouldUpdateFormData } from './formRichTextEditorHelper'

describe('shouldUpdateFormData', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns true when isAutoSave is false (manual save)', () => {
    // Manual saves should always update form data
    expect(shouldUpdateFormData(false)).toBe(true)
  })

  it('returns true during autosave when cursor is NOT in a rich text editor', () => {
    // Mock no rich text editors on page
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([])
    jest.spyOn(document, 'getSelection').mockReturnValue({
      anchorNode: document.createElement('div'),
    })

    expect(shouldUpdateFormData(true)).toBe(true)
  })

  it('returns false during autosave when cursor IS in a rich text editor', async () => {
    const previousContains = HTMLDivElement.prototype.contains
    HTMLDivElement.prototype.contains = () => true

    // Render a rich editor to create the DOM structure
    render(
      <div className="rdw-editor-main" role="textbox" aria-label="rich editor">
        test
      </div>
    )

    const richEditor = await screen.findByRole('textbox', { name: 'rich editor' })
    act(() => {
      richEditor.focus()
    })

    // When cursor is in rich text editor, should return false to prevent form reset
    expect(shouldUpdateFormData(true)).toBe(false)

    HTMLDivElement.prototype.contains = previousContains
  })

  it('returns false during autosave when cursor is in any of multiple rich text editors', () => {
    const mockEditor1 = {
      contains: jest.fn(() => false),
    }
    const mockEditor2 = {
      contains: jest.fn(() => true), // Cursor is in this editor
    }
    const mockEditor3 = {
      contains: jest.fn(() => false),
    }

    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockEditor1, mockEditor2, mockEditor3])
    jest.spyOn(document, 'getSelection').mockReturnValue({
      anchorNode: document.createElement('div'),
    })

    expect(shouldUpdateFormData(true)).toBe(false)

    // Verify all editors were checked
    expect(mockEditor1.contains).toHaveBeenCalled()
    expect(mockEditor2.contains).toHaveBeenCalled()
    // Should stop checking after finding one with cursor
  })

  it('handles null selection gracefully', () => {
    const mockEditor = {
      contains: jest.fn(() => false),
    }

    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockEditor])
    jest.spyOn(document, 'getSelection').mockReturnValue({
      anchorNode: null, // No selection
    })

    // Should return true when no selection (not in editor)
    expect(shouldUpdateFormData(true)).toBe(true)
  })

  it('handles case when no rich text editors exist on page', () => {
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([])
    jest.spyOn(document, 'getSelection').mockReturnValue({
      anchorNode: document.createElement('div'),
    })

    // Should return true when no editors on page
    expect(shouldUpdateFormData(true)).toBe(true)
  })

  it('handles selection with null anchorNode', () => {
    const mockEditor = {
      contains: jest.fn(() => false),
    }

    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockEditor])
    jest.spyOn(document, 'getSelection').mockReturnValue({
      anchorNode: null,
    })

    // Should return true when anchorNode is null
    expect(shouldUpdateFormData(true)).toBe(true)
    expect(mockEditor.contains).toHaveBeenCalledWith(null)
  })

  it('handles undefined selection', () => {
    jest.spyOn(document, 'querySelectorAll').mockReturnValue([])
    jest.spyOn(document, 'getSelection').mockReturnValue(undefined)

    // Should handle gracefully even with undefined selection
    expect(shouldUpdateFormData(true)).toBe(true)
  })

  it('checks all editors when cursor is not in any of them', () => {
    const mockEditor1 = {
      contains: jest.fn(() => false),
    }
    const mockEditor2 = {
      contains: jest.fn(() => false),
    }
    const mockEditor3 = {
      contains: jest.fn(() => false),
    }

    jest.spyOn(document, 'querySelectorAll').mockReturnValue([mockEditor1, mockEditor2, mockEditor3])
    jest.spyOn(document, 'getSelection').mockReturnValue({
      anchorNode: document.createElement('div'),
    })

    expect(shouldUpdateFormData(true)).toBe(true)

    // Verify all editors were checked
    expect(mockEditor1.contains).toHaveBeenCalled()
    expect(mockEditor2.contains).toHaveBeenCalled()
    expect(mockEditor3.contains).toHaveBeenCalled()
  })
})
