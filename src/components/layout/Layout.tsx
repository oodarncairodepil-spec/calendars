import { ReactNode } from "react";
import { TopNav, MobileNav } from "./Navigation";

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export const Layout = ({ children, showNav = true }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      {showNav && <TopNav />}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      {showNav && <MobileNav />}
    </div>
  );
};
