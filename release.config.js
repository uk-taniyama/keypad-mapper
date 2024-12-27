/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  plugins: [
    // Determine the type of release by analyzing commits with conventional-changelog.
    [
      '@semantic-release/commit-analyzer',
      { preset: 'conventionalcommits' },
    ],

    // Generate release notes for the commits added since the last release with conventional-changelog.
    [
      '@semantic-release/release-notes-generator',
      { preset: 'conventionalcommits' },
    ],

    // Create or update a changelog file in the local project directory with the changelog content created in the generate notes step.
    '@semantic-release/changelog',

    // Update the package.json version and create the npm package tarball.
    // Add a release to a dist-tag.
    // Publish the npm package to the registry.
    '@semantic-release/npm',

    // Create a release commit, including configurable file assets.
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
      },
    ],

    // Publish a GitHub release, optionally uploading file assets.
    // Update a GitHub release's pre-release field.
    // Add a comment to each GitHub Issue or Pull Request resolved by the release and close issues previously open by the fail step.
    '@semantic-release/github',
  ],
};
