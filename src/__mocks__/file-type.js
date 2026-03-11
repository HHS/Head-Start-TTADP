const path = require('path');

const extensionToType = {
  '.pdf': { ext: 'pdf', mime: 'application/pdf' },
  '.txt': { ext: 'txt', mime: 'text/plain' },
  '.csv': { ext: 'csv', mime: 'text/csv' },
};

const fileTypeFromFile = async (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  return extensionToType[extension] || null;
};

module.exports = {
  fileTypeFromFile,
};
