# Replace Create-React-App with Vite

## Status

Proposed

## Context

Create React App is no longer supported, even as React versions increase. The [official React documentation](https://react.dev/learn/start-a-new-react-project) no longer mentions the project. They recommend the use of a framework, specifically listing Next.js, Gatsby, and Remix. While all three of those products would offer advantages and improvements, implementation would be a complicated and time-consuming affair.

## Decision

A clear alternative lies in the [Vite](https://vite.dev/) project, which operates at a similar level to Create React App in that it compiles React code into static HTML, but does not attempt to enforce the server side model that the frameworks listed above use. Vite is actively supported and uses esbuild instead of webpack as it's underlying technology.


## Consequences

While this change would not be pain-free, there are numerous guides available online to make this transition simple. With some configuration and adaquate testing, the app would deliver an identical experience to the end user, while also increasing local development performance. 