const getReview = require('./get-review');
const getUserStatus = require('./get-user-status');

const transformUpdate = update => {
  if (update.type === 'userstatus') {
    return getUserStatus(update);
  }

  if (update.type === 'review') {
    return getReview(update);
  }

  return null;
};

module.exports = transformUpdate;
