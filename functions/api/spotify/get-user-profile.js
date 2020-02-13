const profile = require('./user-profile.mock.json');

const getUserProfile = async () => {
    return profile;
};

module.exports = getUserProfile;
