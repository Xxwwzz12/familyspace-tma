// src/components/Layout.tsx
import React from 'react';

type LayoutProps = {
  children: React.ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div>
      <h1>Layout</h1>
      <div>{children}</div>
    </div>
  );
};

export default Layout;
