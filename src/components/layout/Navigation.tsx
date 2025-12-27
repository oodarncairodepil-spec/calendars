import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, FolderOpen, Image, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLinkItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavLinkItem = ({ to, icon, label, isActive }: NavLinkItemProps) => (
  <Link to={to} className="relative">
    <motion.div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </motion.div>
    {isActive && (
      <motion.div
        layoutId="nav-indicator"
        className="absolute inset-0 bg-secondary rounded-lg -z-10"
        initial={false}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />
    )}
  </Link>
);

export const TopNav = () => {
  const location = useLocation();
  const pathname = location.pathname;

  const links = [
    { to: "/", icon: <Calendar className="w-4 h-4" />, label: "Dashboard" },
    { to: "/editor", icon: <FolderOpen className="w-4 h-4" />, label: "Editor" },
    { to: "/library", icon: <Image className="w-4 h-4" />, label: "Library" },
    { to: "/settings", icon: <Settings className="w-4 h-4" />, label: "Settings" },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b">
      <div className="container flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-lg hidden sm:block">
              Calendar Maker
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <NavLinkItem
                key={link.to}
                {...link}
                isActive={
                  link.to === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.to)
                }
              />
            ))}
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link to="/editor">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm shadow-soft hover:shadow-medium transition-shadow"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Project</span>
            </motion.button>
          </Link>
        </div>
      </div>
    </header>
  );
};

export const MobileNav = () => {
  const location = useLocation();
  const pathname = location.pathname;

  const links = [
    { to: "/", icon: <Calendar className="w-5 h-5" />, label: "Home" },
    { to: "/editor", icon: <FolderOpen className="w-5 h-5" />, label: "Editor" },
    { to: "/library", icon: <Image className="w-5 h-5" />, label: "Library" },
    { to: "/settings", icon: <Settings className="w-5 h-5" />, label: "Settings" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t">
      <div className="flex items-center justify-around h-16 px-2">
        {links.map((link) => {
          const isActive =
            link.to === "/" ? pathname === "/" : pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.icon}
              <span className="text-xs font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
