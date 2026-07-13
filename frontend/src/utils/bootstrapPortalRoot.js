/**
 * react-bootstrap's Modal/Overlay/Tooltip components render via a React portal
 * straight into <body>, which would escape any in-tree `.bootstrap-scope`
 * wrapper and lose Bootstrap's (scoped) styling.
 *
 * `index.html` defines a fixed `#bootstrap-portal-root` element with the
 * `.bootstrap-scope` class already applied. Pass this getter to a component's
 * `container` prop so its portal renders inside that scoped element instead
 * of directly under <body>.
 *
 * Example:
 *   <Modal container={getBootstrapPortalRoot} ...>
 */
export const getBootstrapPortalRoot = () => document.getElementById('bootstrap-portal-root');
