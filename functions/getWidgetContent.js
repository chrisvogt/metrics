"use strict";

const getGitHubWidgetContent = require('./lib/get-github-widget-content');

const widgetHandlerMap = {
	github: getGitHubWidgetContent
};

const getWidgetContent = async ({ context, req }) => {
  const {
    query: { widget }
  } = req;

  if (!widgetHandlerMap[widget]) {
	return {
        status: "error",
        code: 400,
        error: "Widget type unrecognized or missing."
      };
  }

  const widgetHandler = widgetHandlerMap[widget];
  const payload = await widgetHandler({ context });

  return {
	status: "ok",
	code: 200,
	payload
  };
};

module.exports = getWidgetContent;
