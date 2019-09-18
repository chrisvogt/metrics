const keyMirror = require('keymirror-js');

const collections = [
    'STATS',
    'SUMMARIES'
];

module.exports = keyMirror(collections);
