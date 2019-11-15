"use strict";

const getGitHubWidgetContent = require("./lib/get-github-widget-content");
const getGoodreadsWidgetContent = require("./lib/get-goodreads-widget-content");

const widgetHandlerMap = {
  github: getGitHubWidgetContent,
  goodreads: getGoodreadsWidgetContent
};

const getWidgetContent = async ({ context, req }) => {
  const {
    query: { widget }
  } = req;

  if (!widgetHandlerMap[widget]) {
    throw new Error("Widget type unrecognized or missing.");
  }

  const widgetHandler = widgetHandlerMap[widget];
  const payload = await widgetHandler({ context });

  return payload;
};

module.exports = getWidgetContent;
