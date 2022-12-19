a proposal for a single source of truth for our shared constants, based roughly on the idea provided in the description for the issue at https://ocio-jira.acf.hhs.gov/browse/TTAHUB-1020, more in 🧵:

------------------------

a new local dependency at `/packages/common`:

```
# Head-Start-TTADP/... # project root
frontend
src
packages
└── common
    ├── package.json # package name: @ttahub/common
    └── src
        └── index.js # has shared exports
```

*usage in the backend*

```
# from project root:
$ yarn add file:./packages/common
```

*usage in the frontend*

for those using docker, it's added as a readonly volume at `/app/packages` in `docker-compose.override.yml`:

```
    volumes:
      - "./packages:/app/packages:ro"
```

```
# from /app inside docker container:
$ yarn add file:./packages/common
```

for use w/o docker:

```
# from /frontend:
$ yarn add file:./../packages/common
```

------------------------

the `@ttahub/common` package is then added as a local, relatively-pathed dependency in both the frontend and backend projects:

<image>

------------------------

sample usage from either backend or frontend:

```
import { CONST_A, CONST_B } from '@ttahub/common';
```

------------------------

some pros/cons I can think of:

pros:
- it meets the requirements of a single source of truth
- we can use it for more than just constants (types? various utils?)
- will be a bundled dependency in the frontend
- it exists only within the `Head-Start-TTADP` repo so we don't need to manage npm credentials or `npm publish` anything (or do you think this is a con?)

cons:
- when `@ttahub/common` is modified it will need to be reinstalled with `yarn remove && yarn add file:./packages/common`. if this happens often enough it might become annoying. we might need a `yarn common:reinstall` or something.

thoughts?
