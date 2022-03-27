## Frontend for Lasolsido.org

Lasolsido is a platform to learn about sound and music, with an interactive guide, assignments and practices, and tools to put it into production.

Currently it has a single chapter about music notation. A half working music editor, and a sound synthesizer.

Plan is to fill the chapters about all music theory subjects. Interactive assignments for the learning material. Piano exercises. A full working music editor. A sound synthesizer. Ability to compose and arrange tracks with multiple instruments. MIDI support. Localization. 

All production is planned to be easily shareable via custom dsl like syntax, inspired by Lilypond.org.

Please consider sponsoring the project.


## Contributing

 <3

Currently this is a single page application, plan is to grow this into a fullstack application with a decent backend.

There is no dynamic imports, or lazy loading parts of the code, full code is served for every route. Uses a custom half made router. Has only two dependencies, `solid-js` picked for the competition, kept for the energy and `tamcher` for parsing dsl like syntax custom built by main author of this library.

  - Install dependencies: `yarn install`
  - Local development:    `yarn watch`
  - Production build:     `yarn build`
  - Type check:           `yarn lint`
  - Type check watch:     `yarn lint:watch`
  - Clean dist folder:    `yarn clean`

Output is built into `dist/` folder.

There are a bunch of type errors I haven't gotten around to fixing yet the main paths don't crash.
See [TODO.md](TODO.md) for more information.
