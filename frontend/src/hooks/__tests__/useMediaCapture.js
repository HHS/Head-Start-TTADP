import { renderHook } from '@testing-library/react-hooks'
import html2canvas from 'html2canvas'
import useMediaCapture from '../useMediaCapture'

jest.mock('moment', () => () => ({
  format: jest.fn(() => '2023-10-10'),
}))
jest.mock('html2canvas')

describe('useMediaCapture', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  beforeEach(() => {
    html2canvas.mockResolvedValue({
      toDataURL: jest.fn(() => 'data:image/png;base64,test'),
    })
  })

  it('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    html2canvas.mockRejectedValue(new Error('test error'))

    const reference = { current: document.createElement('div') }
    const { result } = renderHook(() => useMediaCapture(reference))

    await result.current()

    expect(consoleSpy).toHaveBeenCalledWith(new Error('test error'))

    consoleSpy.mockRestore()
  })
})
