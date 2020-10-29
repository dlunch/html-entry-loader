# html-entry-loader

This loader will `require()` html dependencies and inject built css/js to html and extract as file.

## Example

configuration
```js
const HtmlEntryLoader = require('html-entry-loader');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.export = {
  entry: {
    example: 'example.html'
  },
  module: {
    rules: [
      {
        test: /\.(html)$/,
        use: [
          {
            loader: 'html-entry-loader',
            options: {
              minimize: true
            }
          }
        ]
      },
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              onlyCompileBundledFiles: true,
              compilerOptions: {
                module: 'esnext'
              }
            }
          }
        ]
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
            options: {
              esModule: false,
            },
          },
          {
            loader: 'less-loader',
          },
        ],
      },
    ]
  },
  plugins: [
    new HtmlEntryLoader.EntryExtractPlugin()
  ],
}
```

html
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <script src="./example.ts"></script>
    <link rel="stylesheet" href="./example.less"></link>
  </head>
  <body>
  </body>
</html>
```

result
```
<!DOCTYPE html><html><head><meta charset="UTF-8"><script type='text/javascript' src='example.js?<hash>'></script><link rel='stylesheet' href='example.css?<hash>' /></head><body></body></html>
```
