const graphqlGot = require('graphql-got');

// TODO(cvogt): factor these out
function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] !== null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }
function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const buildQuery = (username, maxRepos ) => `query {
		user(login: "${username}") {
			repositories(
				last: ${maxRepos},
				isFork: false,
				affiliations: OWNER,
				privacy: PUBLIC,
				orderBy: {
					field: CREATED_AT,
					direction: ASC
				}
			) {
				nodes {
					name
					description
					url
					primaryLanguage {
						name
						color
					}
					stargazers() {
						totalCount
					}
					forks() {
						totalCount
					}
				}
			}
		}
	}
`;

const MAX_REPOS = 12;
const getLatestRepositories = async ({ config }) => {
  const { github: { access_token: token, username } } = config;

  const query = buildQuery(username, MAX_REPOS);
  const {body} = await graphqlGot('api.github.com/graphql', {
    query,
    token
  });
  
  const repositories = body.user.repositories.nodes.map(repo => {
    return _objectSpread({}, repo, {
      stargazers: repo.stargazers.totalCount,
      forks: repo.forks.totalCount
    });
  });

  return repositories;
}

module.exports = getLatestRepositories