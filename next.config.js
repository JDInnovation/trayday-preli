/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: {
      resolveAlias: {
        // alias genérico
        lodash: "lodash-es",
        // alias explícitos que o Recharts usa
        "lodash/get": "lodash-es/get.js",
        "lodash/isNil": "lodash-es/isNil.js",
        "lodash/isFunction": "lodash-es/isFunction.js",
        "lodash/isEqual": "lodash-es/isEqual.js",
        "lodash/cloneDeep": "lodash-es/cloneDeep.js"
      }
    }
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      lodash: "lodash-es",
      "lodash/get": "lodash-es/get.js",
      "lodash/isNil": "lodash-es/isNil.js",
      "lodash/isFunction": "lodash-es/isFunction.js",
      "lodash/isEqual": "lodash-es/isEqual.js",
      "lodash/cloneDeep": "lodash-es/cloneDeep.js"
    };
    return config;
  }
};
module.exports = nextConfig;
