// src/types/eruda.d.ts
declare module 'eruda' {
  const eruda: {
    init: () => void;
    destroy: () => void;
  };
  export default eruda;
}

declare global {
  interface Window {
    eruda?: {
      init: () => void;
      destroy: () => void;
    };
  }
}

export {};