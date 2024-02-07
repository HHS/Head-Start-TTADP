const notFound = (res, details = '') => {
  res.status(404).json({ status: '404', title: 'Not Found', details });
};

const unauthorized = (res, details = '') => {
  res.status(403).json({ status: '403', title: 'Unauthorized User', details });
};

export {
  notFound,
  unauthorized,
};
