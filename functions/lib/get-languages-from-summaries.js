const rawLanguageCategoryMap = require('./language-map.json');

const categoryMap = Object.entries(rawLanguageCategoryMap).reduce((acc, pair) => {
  const [ categoryName, categoryLanguages ] = pair;
  categoryLanguages.forEach(languageName => {
    acc[languageName] = categoryName;
  });
  return acc;
}, {});

const languagesToFilter = [
  'Image (png)'
];

const getLanguagesFromSummaries = summaries => {
  const languageStats = summaries.reduce((accumulator, summary) => {
    const { languages = [] } = summary;

    languages
      .filter(language => {
        const { name } = language;
        return !languagesToFilter.includes(name);
      })
      .forEach(language => {
        const { name, total_seconds: totalSeconds } = language;

        if (!accumulator[name]) {
          accumulator[name] = {
            category: categoryMap[name] || 'Unknown',
            name,
            seconds: 0
          };
        }

        accumulator[name].seconds += totalSeconds;
      });

    return accumulator;
  }, {});

  const languages = Object.keys(languageStats).map(key => {
    return languageStats[key];
  });

  return languages;
}

module.exports = getLanguagesFromSummaries;
