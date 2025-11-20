# Replace Create-React-App with Vite

## Status

Proposed

## Context

Create React App (CRA) is no longer actively supported, even as newer versions of React are released. The [official React documentation](https://react.dev/learn/start-a-new-react-project) has removed CRA as a recommended option, instead suggesting frameworks like Next.js, Gatsby, and Remix. While these frameworks offer certain advantages, such as server-side rendering and file-based routing, they also introduce more complexity and could require a significant investment of time to implement. For most use cases, the simplicity of CRA is no longer necessary, and a lighter-weight alternative is preferable.

Vite, a modern build tool, has emerged as a compelling choice for React development. It operates similarly to CRA in that it compiles React code into static HTML, but with major improvements. Vite provides faster hot module replacement (HMR), better build speeds, and is built on esbuild, which replaces the slower webpack used in CRA. These improvements make for a much smoother development experience, especially in larger applications.

## Decision

We will replace Create React App with Vite for our React project. Vite offers several compelling advantages over CRA, including:

- **Faster Hot Module Replacement (HMR):** Vite provides near-instantaneous updates to the browser, significantly improving the development workflow and reducing waiting times.
- **Better Build Speeds:** Vite leverages esbuild for both development and production builds, offering much faster compilation times compared to webpack. This results in a more responsive and efficient build process.
- **Reduced Complexity:** Vite’s configuration and ecosystem are simpler than CRA’s, especially with respect to tooling and plugin integration. Unlike CRA, Vite does not require complex configurations or custom scripts for common workflows.
- **Modern JavaScript Features:** Vite supports the latest standards out of the box, including ES modules, TypeScript, and PostCSS. It also supports hot module replacement for faster and more efficient updates during development.

## Consequences

### Benefits:
- **Improved Developer Experience:** With Vite, local development performance will be significantly improved, particularly in terms of HMR and faster build times. This will make iterative development faster and more productive for the team.
- **Simpler Configuration:** Vite’s out-of-the-box configuration reduces the need for complex customization compared to CRA, which relied heavily on webpack’s sometimes opaque configuration.
- **Future-Proofing:** Vite is actively maintained and increasingly becoming the go-to tool for modern JavaScript development, meaning we will be aligning with a more current and widely adopted tool.

### Potential Risks:
- **Compatibility Issues with Existing CRA-Specific Configurations or Dependencies:** If the project has custom configurations, plugins, or dependencies tailored specifically to CRA (e.g., relying on certain webpack setups or CRA-specific scripts), there may be issues migrating these over to Vite. Some of these dependencies might need to be replaced or reconfigured for compatibility with Vite's ecosystem. Since we don't extend or modify the vanilla CRA configuration, this is unlikely to be an issue.
- **Learning Curve for the Team:** Although Vite is simpler than CRA in many respects, there will still be a learning curve for the team, especially if they are accustomed to CRA's workflow or webpack configuration. Time may be required for the team to get comfortable with Vite’s configuration and features.
- **Migrating Existing Codebase:** While Vite aims to be as compatible with CRA as possible, some parts of the existing codebase might require adjustments—especially if there are features or dependencies that assume CRA's specific setup. A detailed migration plan and testing will be necessary to ensure smooth adoption. Since we don't extend or modify the vanilla CRA configuration, this is unlikely to be a substantial hurdle.
- **Possible Short-Term Disruption:** The switch to Vite, while beneficial in the long run, may temporarily disrupt development workflows as the team adapts to the new tool and resolves compatibility issues.

In summary, while there are some potential challenges with the migration, the benefits—particularly in terms of faster builds, improved developer experience, and reduced complexity—make Vite a strong alternative to CRA.
