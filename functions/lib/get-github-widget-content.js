const graphqlGot = require("graphql-got");
const fs = require("fs");
const path = require("path");

const query = fs.readFileSync(
  path.resolve(__dirname, "../queries/github-widget-content.gql"),
  "utf8"
);

const getGitHubWidgetContent = async ({ context }) => {
  const {
    config: {
      github: { access_token: token, username }
    }
  } = context;

  const { body } = await graphqlGot("https://api.github.com/graphql", {
    query,
    token,
    variables: {
      username
    }
  });

  return body;
};

module.exports = getGitHubWidgetContent;
