## disclaimer

this is a fork of [mary](https://bsky.app/profile/did:plc:ia76kvnndjutgedggx2ibrem)'s [skeetgen](https://mary-ext.codeberg.page/skeetgen/) ([source code](https://codeberg.org/mary-ext/skeetgen)).<br>

changes:

- supports multiple repos
- adds execute permissions to blob directory so images can be loaded properly
- adds handling for post records without text (will not cause the import to fail)
- fixes timeline page title off by one error
- adds video support
- adds alt text search
- adds alt text button (uses js, probably warrants more consideration as a deviation)
- sorts posts by createdAt rather than rkey

i cannot overstate how much of a nightmare my code is (what was I thinking when i parameterized context?).<br>
maybe i'll clean it up next weekend (clueless).

## TODO

- run prettier (yeesh)
- individual profile pages
- more powerful search (from:, until:, since:, etc)
- alt text link chips [drearycore](https://github.com/DrearyWillow/drearycore)
- revert context params to get_page_context
- revert generate-archive-form to one big function again

## Usage

```bash
$ npm install # or pnpm install or yarn install
```

### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.<br>
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.<br>
Run `npm run gen` first to generate necessary css and script files.

### `npm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Deployment

Learn more about deploying your application with the [documentations](https://vitejs.dev/guide/static-deploy.html)
