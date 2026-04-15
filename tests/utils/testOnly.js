"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calledFromTestFileOrDirectory = void 0;
const calledFromTestFileOrDirectory = () => (new Error().stack?.split('\n') || [])
    .some(line => {
    const trimmedLine = line.trim();
    return (trimmedLine.includes('.test.js') ||
        trimmedLine.includes('.test.ts') ||
        trimmedLine.includes('/tests/') ||
        trimmedLine.includes('/testingOnly/'));
});
exports.calledFromTestFileOrDirectory = calledFromTestFileOrDirectory;
