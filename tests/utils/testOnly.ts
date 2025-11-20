
export const calledFromTestFileOrDirectory = (): boolean => (new Error().stack?.split('\n') || [])
  .some(line => {
    const trimmedLine = line.trim();

    return (
      trimmedLine.includes('.test.js') ||
      trimmedLine.includes('.test.ts') ||
      trimmedLine.includes('/tests/') ||
      trimmedLine.includes('/testingOnly/')
    );
  });
