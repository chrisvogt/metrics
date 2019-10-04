const getTimesFromSummaries = (summaries = []) => {
  const timeByDay = summaries.map(summary => {
    const {
      grand_total: { hours, minutes, total_seconds: totalSeconds } = {},
      range: { date } = {}
    } = summary;
    return {
      date,
      hours,
      minutes,
      totalSeconds
    };
  });
  return timeByDay;
};

module.exports = getTimesFromSummaries;
