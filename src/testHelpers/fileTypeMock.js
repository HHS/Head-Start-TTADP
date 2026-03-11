const path = require('path');

const fileTypeFromFile = async (filePath) => {
  if (typeof filePath !== 'string') {
    return null;
  }

  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.pdf') {
    return { ext: 'pdf', mime: 'application/pdf' };
  }

  if (extension === '.txt') {
    return { ext: 'txt', mime: 'text/plain' };
  }

  if (extension === '.csv') {
    return { ext: 'csv', mime: 'text/csv' };
  }

  return null;
};

module.exports = {
  fileTypeFromFile,
};
