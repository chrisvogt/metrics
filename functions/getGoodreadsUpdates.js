'use strict';

const fs = require('fs');
const get = require('lodash').get;
const got = require('got');
const util = require('util');
const xml2js = require('xml2js');

const transformUpdate = require('./lib/transform-update');

const readFileAsync = util.promisify(fs.readFile);
const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  trim: true,
});

const getGoodreadsUpdates = async ({ config }) => {
  const { goodreads: { access_token: accessToken, user_id: userID } } = config;
  const goodreadsURL = `https://www.goodreads.com/user/show/${ userID }?format=xml&key=${ accessToken }`;

  const response = await got(goodreadsURL);
  const xml = response.body;

  let updates;

  parser.parseString(xml, (err, result) => {
    if (err) {
      console.error('An error!', err);
    }

    const rawUpdates = get(result, 'GoodreadsResponse.user.updates.update', []);
    const isDefined = subject => Boolean(subject);
    const validateUpdate = update => update.type === 'userstatus' || update.type === 'review';

    // TODO: only show the latest `type: userstatus` per unique `book.goodreadsID`.
    // otherwise, show every `type: review'.
    updates = rawUpdates
      .filter(update => validateUpdate(update))
      .map(update => transformUpdate(update))
      .filter(update => isDefined(update));
  });

  return updates;
};

module.exports = getGoodreadsUpdates;
