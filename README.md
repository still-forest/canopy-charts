# Canopy Charts

_React charts, built with VisX and [Canopy](https://github.com/still-forest/canopy)_

**Resources**

- [Github repo](https://github.com/still-forest/canopy-charts)
- Distribution
  - [npm registry](https://www.npmjs.com/package/@still-forest/canopy-charts)
- Building blocks
  - [TailwindCSS](https://tailwindcss.com/docs)
  - [shadcn-ui](https://ui.shadcn.com/docs/)
    - [color themes](https://ui.shadcn.com/colors)
  - [Vite](https://vite.dev/guide/)
  - [Vitest](https://vitest.dev/guide/)
- Documentation via Storybook
  - [Github Pages](https://still-forest.github.io/canopy-charts/)
- Development
  - [Renovate](https://developer.mend.io/github/still-forest/canopy-charts)
- Other documentation, documents
  - [Changelog](./CHANGELOG.md)

---

## Usage

### Installation

When using Vite, Canopy Charts must be included in your primary `.css` file in order to ensure the necessary CSS classes are included in the build. For more details, read the Tailwind CSS documentation on [explicitly registering sources](https://tailwindcss.com/docs/detecting-classes-in-source-files#explicitly-registering-sources).

Example `index.css`:

```css
@import "tailwindcss";
@source "../node_modules/@still-forest/canopy-charts/dist";

@layer base {
  /* your usual CSS definitions */
}
```
