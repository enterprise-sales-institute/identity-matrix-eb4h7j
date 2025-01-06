// @babel/preset-env ^7.22.0 - Smart preset for JavaScript transpilation with modern browser support
// @babel/preset-react ^7.22.0 - React preset for JSX transpilation with automatic runtime
// @babel/preset-typescript ^7.22.0 - TypeScript preset for TS/TSX transpilation

module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          browsers: [
            "chrome >= 90",
            "firefox >= 88", 
            "safari >= 14",
            "edge >= 90"
          ]
        },
        modules: "auto",
        useBuiltIns: "usage",
        corejs: 3
      }
    ],
    [
      "@babel/preset-react",
      {
        runtime: "automatic",
        development: true
      }
    ],
    [
      "@babel/preset-typescript",
      {
        isTSX: true,
        allExtensions: true
      }
    ]
  ],
  env: {
    test: {
      presets: [
        [
          "@babel/preset-env",
          {
            targets: {
              node: "current"
            }
          }
        ],
        "@babel/preset-react",
        "@babel/preset-typescript"
      ]
    },
    production: {
      presets: [
        [
          "@babel/preset-env",
          {
            modules: false,
            useBuiltIns: "usage",
            corejs: 3
          }
        ]
      ]
    }
  }
};