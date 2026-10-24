import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      // Static export with `images.unoptimized`: next/image would add JS without
      // resizing anything. The only <img> are small local logos in fixed boxes.
      '@next/next/no-img-element': 'off',
    },
  },
]

export default config
