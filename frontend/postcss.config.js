import prefixSelector from 'postcss-prefix-selector';

/**
 * Bootstrap's CSS (including Reboot, its global reset) is scoped under
 * `.bootstrap-scope` so it cannot affect MUI components or global elements
 * elsewhere in the app. Only rules coming from the `bootstrap` package are
 * prefixed — everything else (MUI/emotion output, index.css) passes through
 * untouched.
 *
 * Usage: wrap any section that uses react-bootstrap components in
 * `<div className="bootstrap-scope">...</div>`.
 */
export default {
  plugins: [
    prefixSelector({
      prefix: '.bootstrap-scope',
      transform(prefix, selector, prefixedSelector, filePath) {
        const isBootstrapFile = filePath.replace(/\\/g, '/').includes('/bootstrap/');

        if (!isBootstrapFile) {
          return selector;
        }

        // Root-level selectors: scope them to apply "inside" .bootstrap-scope
        // instead of prefixing (which would produce invalid ".bootstrap-scope html").
        if (selector === 'html' || selector === ':root' || selector === 'body') {
          return prefix;
        }

        return prefixedSelector;
      }
    })
  ]
};
