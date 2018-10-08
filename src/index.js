import datalayer, { Datalayer } from './datalayer';

// export Datalayer class
export { Datalayer };

// export datalayer singleton instance as default
export default datalayer;

// export helpers
export { default as Plugin } from './Plugin';
export * from './extensions';
export * from './helpers';
