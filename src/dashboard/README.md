# `src/dashboard`

Implementer-owned UI modules.

`scripts/build.py` should assemble these into `output/index.html` with:

```js
window.DATA = { /* world.json */ };
```

Suggested modules: `shell` (filter bar + tabs), then one folder/file per tab under `tabs/`.
