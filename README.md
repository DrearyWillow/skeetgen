## disclaimer

this is a fork of [mary](https://bsky.app/profile/did:plc:ia76kvnndjutgedggx2ibrem)'s [skeetgen](https://mary-ext.codeberg.page/skeetgen/) ([source code](https://codeberg.org/mary-ext/skeetgen)).<br>

changes:

- supports multiple repos
- adds profile pages
- adds quote pages
- adds video support
- adds alt text search
- adds alt text button (uses js, probably warrants more consideration as a deviation)
- adds page input buttons (uses js)
- adds execute permissions to blob directory so images can be loaded properly
- adds handling for post records without text (will not cause the import to fail)
- fixes timeline page title off by one error
- sorts posts by createdAt rather than rkey

i cannot overstate how much of a nightmare my code is (what was I thinking when i parameterized context?).<br>
maybe i'll clean it up next weekend (clueless).

## TODO

- more powerful search (from:, until:, since:, domain:?, replyto:?, blob:cid, hashtags? [pretty sure we can just rely on `#hashtag` string])
  - from: should support did as well as handle because of the multi-handle or no-handle problem
  - weird sorting rn, maybe paramaterize? maybe move sort into filter? process_results?
  - too many kasey results in the thing, dunno why
  - consider modifying search to tokenize forward or full
    - maybe conditionally switch to a separate flexsearch document if the search string contains "\*" or something
- threadpage parent uri broken a little, need to fix
- alt text link chips (like [drearycore](https://github.com/DrearyWillow/drearycore))
- add clickable links inside of alt text modal
- @s should check if the repo is the archive set
- home page should sort repos better (first post date, post count)
- home page should list number of posts
- home page should list dids underneath? or should not wrap?
- revert context params to get_page_context, or subsume into one context param
  - redesign `profile` in `ContextData` when you do this
  - maybe do one big loop to optimize at the start when building ctx
    - all posts (and maybe one split out by did with the uri instead of rkey)
    - blob cids for search
    - replies/ancestors/quotes?
    - benefits:
      - lower time complexity
      - everything prebuilt in a context array
    - drawbacks:
      - less clarity where things are actually coming from
      - less modular
      - more messy
      - less flexible: will have to go back and change context code every time you want a new data item
- less terrible variable names (specifically, archive in ctx, overlay -> modal, allposts, page-picker)
- add image modal on click (alt text?)
- look back at mary's ~~image~~ css, mine is ugly
- did i break something with thread views? some replies without parents despite being same-user?
- ensure de-dupe works okay if two identical repos are entered
- color scheme (pink yay)
- don't render videos in timeline quotes (too small), thumbnail should be fine?
- update no js warnings
- update attribution links

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
